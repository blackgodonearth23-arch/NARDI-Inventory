const db = require('../config/db');
const QRCode = require('qrcode');

const Container = {
  // ... (keep existing methods: getByChemical, getByLocation, findById, findByPin, addContainers, getExpiringSoon)

  async transferContainers(chemicalId, quantity, fromLocationId, toLocationId, userId, baseUrl, expiryDate = null) {
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
        throw new Error(`Not enough containers available. Requested ${quantity}, found ${containers.length}.`);
      }

      const updatedContainers = [];
      for (const cont of containers) {
        let pin = cont.pin_5;
        if (!pin) {
          // generate unique PIN
          let success = false;
          let attempts = 0;
          while (!success && attempts < 100) {
            attempts++;
            pin = String(Math.floor(10000 + Math.random() * 90000));
            try {
              const qrCodeUrl = `${baseUrl}/chemicals/open?pin=${pin}`;
              const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);
              await trx('chemical_containers')
                .where({ id: cont.id })
                .update({
                  pin_5: pin,
                  location_id: toLocationId,
                  expiry_date: expiryDate,
                  qr_code: qrCodeDataUrl,   // store the data URL (image)
                  updated_at: db.fn.now(),
                });
              success = true;
            } catch (err) {
              if (err.code === '23505') continue;
              throw err;
            }
          }
          if (!success) throw new Error('Could not generate a unique PIN after 100 attempts');
        } else {
          // generate QR code even if pin exists (transfer without PIN? should not happen, but just in case)
          const qrCodeUrl = `${baseUrl}/chemicals/open?pin=${pin}`;
          const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);
          await trx('chemical_containers')
            .where({ id: cont.id })
            .update({
              location_id: toLocationId,
              expiry_date: expiryDate,
              qr_code: qrCodeDataUrl,
              updated_at: db.fn.now(),
            });
        }

        await trx('chemical_container_transfers').insert({
          container_id: cont.id,
          from_location_id: fromLocationId,
          to_location_id: toLocationId,
          performed_by: userId,
        });

        const updatedContainer = await trx('chemical_containers').where({ id: cont.id }).first();
        updatedContainers.push(updatedContainer);
      }

      await trx.commit();
      return updatedContainers;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },

  // get all bottles for lab user (sub-storage only, current=true, not deleted)
  async getBottlesForLabUser(labId) {
    return db('chemical_containers')
      .join('chemicals', 'chemical_containers.chemical_id', 'chemicals.id')
      .join('locations', 'chemical_containers.location_id', 'locations.id')
      .where('locations.lab_id', labId)
      .where('locations.type', 'lab_sub')
      .where('chemical_containers.is_deleted', false)
      .where('chemical_containers.current', true)
      .select(
        'chemical_containers.*',
        'chemicals.name as chemical_name',
        'locations.name as location_name'
      );
  },

  async open(pin, userId) {
    const container = await this.findByPin(pin);
    if (!container) throw new Error('Container not found');
    if (container.status !== 'unopened') throw new Error('Container is already opened or empty');

    await db.transaction(async (trx) => {
      // set previous opened bottles of same chemical in same sub-storage to current=false
      await trx('chemical_containers')
        .where({
          chemical_id: container.chemical_id,
          location_id: container.location_id,
          status: 'opened',
          current: true,
        })
        .update({ current: false, updated_at: db.fn.now() });

      // open this one
      await trx('chemical_containers').where({ id: container.id }).update({
        status: 'opened',
        opened_by: userId,
        opened_at: db.fn.now(),
        current: true,
        updated_at: db.fn.now(),
      });
    });

    return this.findById(container.id);
  },

  async voidContainer(id, userId) {
    const container = await this.findById(id);
    if (!container) throw new Error('Container not found');
    await db('chemical_containers').where({ id }).update({
      status: 'void',
      updated_at: db.fn.now(),
    });
    return this.findById(id);
  },

  async updateExpiry(id, expiryDate) {
    const container = await this.findById(id);
    if (!container) throw new Error('Container not found');
    await db('chemical_containers').where({ id }).update({
      expiry_date: expiryDate,
      updated_at: db.fn.now(),
    });
    return this.findById(id);
  },

  async purgeOldOpened(labId, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return db('chemical_containers')
      .join('locations', 'chemical_containers.location_id', 'locations.id')
      .where('locations.lab_id', labId)
      .where('locations.type', 'lab_sub')
      .where('chemical_containers.status', 'opened')
      .where('chemical_containers.current', false)
      .where('chemical_containers.opened_at', '<', cutoff)
      .update({
        is_deleted: true,
        updated_at: db.fn.now(),
      });
  },
};

module.exports = Container;