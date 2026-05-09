const db = require('../config/db');

const Container = {
  async getByChemical(chemicalId, locationId = null) {
    let query = db('chemical_containers')
      .join('chemicals', 'chemical_containers.chemical_id', 'chemicals.id')
      .where('chemical_containers.chemical_id', chemicalId)
      .where('chemical_containers.is_deleted', false)
      .select('chemical_containers.*', 'chemicals.name as chemical_name');
    if (locationId) query = query.where('chemical_containers.location_id', locationId);
    return query;
  },

  async getByLocation(locationId) {
    return db('chemical_containers')
      .join('chemicals', 'chemical_containers.chemical_id', 'chemicals.id')
      .where('chemical_containers.location_id', locationId)
      .where('chemical_containers.is_deleted', false)
      .select('chemical_containers.*', 'chemicals.name as chemical_name');
  },

  async findById(id) {
    return db('chemical_containers').where({ id, is_deleted: false }).first();
  },

  async findByPin(pin) {
    return db('chemical_containers').where({ pin_5: pin, is_deleted: false }).first();
  },

  async addContainers(chemicalId, locationId, count, containerType = 'glass_bottle', size = null, unit = null, generatePin = true) {
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
                is_deleted: false
              });
              success = true;
            } catch (err) {
              if (err.code === '23505') continue; // unique PIN violation
              throw err;
            }
          }
          if (!success) throw new Error('Could not generate a unique PIN after 100 attempts');
        } else {
          // No PIN – bulk primary storage
          await trx('chemical_containers').insert({
            chemical_id: chemicalId,
            location_id: locationId,
            status: 'unopened',
            container_type: containerType,
            container_size: size,
            container_unit: unit,
            is_deleted: false
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

  // Transfer containers: assign PIN and move from primary to sub‑storage
  async transferContainers(chemicalId, quantity, fromLocationId, toLocationId) {
    const trx = await db.transaction();
    try {
      // Lock and select unopened containers without PINs from the primary source
      const containers = await trx('chemical_containers')
        .where({
          chemical_id: chemicalId,
          location_id: fromLocationId,
          status: 'unopened',
          is_deleted: false
        })
        .whereNull('pin_5')
        .limit(quantity)
        .forUpdate()
        .select('id');

      if (containers.length < quantity) {
        throw new Error(`Not enough containers available. Requested ${quantity}, found ${containers.length}.`);
      }

      const updatedContainers = [];
      for (const cont of containers) {
        // Generate a unique PIN for each
        let pin;
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
                updated_at: db.fn.now()
              });
            success = true;
          } catch (err) {
            if (err.code === '23505') continue; // duplicate PIN, try again
            throw err;
          }
        }
        if (!success) throw new Error('Could not assign unique PIN');
        updatedContainers.push({ ...cont, pin_5: pin });
      }

      // Log transactions
      const txRows = containers.map(cont => ({
        user_id: null, // will be set by route from req.user
        action_type: 'transfer',
        item_type: 'container',
        item_id: cont.id,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        quantity_change: 1,
        metadata: { pin_5: null } // will be filled below
      }));
      await trx('transactions').insert(txRows);

      await trx.commit();
      return updatedContainers;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },

  async open(pin, userId) {
    // unchanged
    const [updated] = await db('chemical_containers')
      .where({ pin_5: pin, is_deleted: false, status: 'unopened' })
      .update({ status: 'opened', opened_by: userId, opened_at: db.fn.now() })
      .returning('*');
    if (!updated) {
      const container = await this.findByPin(pin);
      if (!container) throw new Error('Container not found');
      if (container.status !== 'unopened') throw new Error('Container is already opened or not available');
      throw new Error('Container not found');
    }
    return updated;
  },

  async softDelete(id) {
    await db('chemical_containers').where({ id }).update({ is_deleted: true });
  }
};

module.exports = Container;