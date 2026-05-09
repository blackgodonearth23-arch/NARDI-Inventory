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

  async addContainers(chemicalId, locationId, count, containerType = 'glass_bottle') {
    const trx = await db.transaction();
    try {
      for (let i = 0; i < count; i++) {
        let pin, success = false;
        while (!success) {
          pin = _generatePin();
          try {
            await trx('chemical_containers').insert({
              chemical_id: chemicalId,
              pin_5: pin,
              location_id: locationId,
              status: 'unopened',
              container_type: containerType,
              is_deleted: false
            });
            success = true;
          } catch (err) {
            if (err.code === '23505') { // unique violation
              continue;
            }
            throw err;
          }
        }
      }
      await trx.commit();
      return count;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },

  async open(pin, userId) {
    const [updated] = await db('chemical_containers')
      .where({ pin_5: pin, is_deleted: false, status: 'unopened' })
      .update({
        status: 'opened',
        opened_by: userId,
        opened_at: db.fn.now()
      })
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

function _generatePin() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

module.exports = Container;