const db = require('../config/db');

const Container = {
  async getByChemical(chemicalId, locationId = null) {
    let query = db('chemical_containers')
      .join('chemicals', 'chemical_containers.chemical_id', 'chemicals.id')
      .where('chemical_containers.chemical_id', chemicalId)
      .where('chemical_containers.is_deleted', false)
      .select(
        'chemical_containers.*',
        'chemicals.name as chemical_name'
      );

    if (locationId) {
      query = query.where('chemical_containers.location_id', locationId);
    }

    return query;
  },

  async getByLocation(locationId) {
    return db('chemical_containers')
      .join('chemicals', 'chemical_containers.chemical_id', 'chemicals.id')
      .where('chemical_containers.location_id', locationId)
      .where('chemical_containers.is_deleted', false)
      .select(
        'chemical_containers.*',
        'chemicals.name as chemical_name'
      );
  },

  async findById(id) {
    return db('chemical_containers').where({ id, is_deleted: false }).first();
  },

  async findByPin(pin) {
    return db('chemical_containers').where({ pin_5: pin, is_deleted: false }).first();
  },

  async addContainers(
    chemicalId,
    locationId,
    count,
    containerType = 'glass_bottle',
    size = null,
    unit = null,
    generatePin = true,
    expiryDate = null
  ) {
    const trx = await db.transaction();

    try {
      for (let i = 0; i < count; i++) {
        let pin = null;
        if (generatePin) {
          let success = false;
          let attempts = 0;
          while (!success && attempts < 100) {
            attempts++;
            pin = String(Math.floor(10000 + Math.random() * 90000));
            try {
              await trx('chemical_containers').insert({
                chemical_id: chemicalId,
                pin_5: pin,
                location_id: locationId,
                status: 'unopened',
                container_type: containerType,
                container_size: size,
                container_unit: unit,
                expiry_date: expiryDate,
                is_deleted: false,
              });
              success = true;
            } catch (err) {
              if (err.code === '23505') continue;
              throw err;
            }
          }
          if (!success) throw new Error('Could not generate a unique PIN after 100 attempts');
        } else {
          await trx('chemical_containers').insert({
            chemical_id: chemicalId,
            location_id: locationId,
            status: 'unopened',
            container_type: containerType,
            container_size: size,
            container_unit: unit,
            expiry_date: expiryDate,
            is_deleted: false,
          });
        }
      }

      await trx.commit();
      return count;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },

  async transferContainers(chemicalId, quantity, fromLocationId, toLocationId, userId, expiryDate = null) {
    const trx = await db.transaction();

    try {
      const containers = await trx('chemical_containers')
        .where({
          chemical_id: chemicalId,
          location_id: fromLocationId,
          status: 'unopened',
          is_deleted: false,
        })
        .limit(quantity)
        .forUpdate()
        .select('id', 'pin_5');

      if (containers.length < quantity) {
        throw new Error(
          `Not enough containers available. Requested ${quantity}, found ${containers.length}.`
        );
      }

      const updatedContainers = [];
      for (const cont of containers) {
        let pin = cont.pin_5;
        if (!pin) {
          let success = false;
          let attempts = 0;
          while (!success && attempts < 100) {
            attempts++;
            pin = String(Math.floor(10000 + Math.random() * 90000));
            try {
              await trx('chemical_containers')
                .where({ id: cont.id })
                .update({
                  pin_5: pin,
                  location_id: toLocationId,
                  expiry_date: expiryDate,
                  updated_at: db.fn.now(),
                });
              success = true;
            } catch (err) {
              if (err.code === '23505') continue;
              throw err;
            }
          }
        } else {
          await trx('chemical_containers')
            .where({ id: cont.id })
            .update({
              location_id: toLocationId,
              expiry_date: expiryDate,
              updated_at: db.fn.now(),
            });
        }

        await trx('chemical_container_transfers').insert({
          container_id: cont.id,
          from_location_id: fromLocationId,
          to_location_id: toLocationId,
          performed_by: userId,
        });

        updatedContainers.push({ ...cont, pin_5: pin, location_id: toLocationId });
      }

      await trx.commit();
      return updatedContainers;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },

  async getExpiringSoon(days = 30) {
    return db('chemical_containers')
      .where('is_deleted', false)
      .whereNotNull('expiry_date')
      .where('expiry_date', '<=', db.raw(`CURRENT_DATE + INTERVAL '${days} days'`))
      .where('expiry_date', '>=', db.raw('CURRENT_DATE'))
      .select('*');
  },

  async open(pin, userId) {
    const container = await this.findByPin(pin);
    if (!container) throw new Error('Container not found');
    if (container.status !== 'unopened') throw new Error('Container is already opened or empty');

    await db('chemical_containers').where({ id: container.id }).update({
      status: 'opened',
      opened_by: userId,
      opened_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return this.findById(container.id);
  },
};

module.exports = Container;