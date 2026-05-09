const db = require('../config/db');

const ICTHardware = {
  async getAll(filters = {}, user = null) {
    let query = db('ict_hardware')
      .leftJoin('locations', 'ict_hardware.location_id', 'locations.id')
      .leftJoin('labs', 'ict_hardware.lab_id', 'labs.id')
      .select(
        'ict_hardware.*',
        'locations.name as station_name',
        'labs.name as department_name'
      )
      .where('ict_hardware.is_deleted', false);

    if (filters.type) query = query.where('ict_hardware.type', filters.type);
    if (filters.status) query = query.where('ict_hardware.status', filters.status);
    if (filters.lab_id) query = query.where('ict_hardware.lab_id', filters.lab_id);
    if (filters.asset_id) query = query.where('ict_hardware.asset_id', 'ilike', `%${filters.asset_id}%`);
    if (filters.assigned_to_employee) {
      query = query.where('ict_hardware.assigned_to_employee', 'ilike', `%${filters.assigned_to_employee}%`);
    }
    return query;
  },

  async findById(id) {
    return db('ict_hardware')
      .leftJoin('locations', 'ict_hardware.location_id', 'locations.id')
      .leftJoin('labs', 'ict_hardware.lab_id', 'labs.id')
      .select('ict_hardware.*', 'locations.name as station_name', 'labs.name as department_name')
      .where('ict_hardware.id', id)
      .where('ict_hardware.is_deleted', false)
      .first();
  },

  async create(data, userId) {
    const trx = await db.transaction();
    try {
      // Ensure asset_id uniqueness globally
      if (data.asset_id) {
        const existing = await trx('ict_hardware')
          .where({ asset_id: data.asset_id, is_deleted: false }).first();
        if (existing) throw new Error('Asset ID already exists');
      }
      const [hw] = await trx('ict_hardware')
        .insert({
          asset_id: data.asset_id || null,
          computer_name: data.computer_name || null,
          org_serial: data.serial_number || data.org_serial,
          type: data.type,
          model: data.model,
          status: data.status || 'new',
          office_number: data.office_number || null,
          assigned_to_employee: data.assigned_to_employee || null,
          issued_date: data.issued_date || null,
          return_date: data.return_date || null,
          price: data.price || null,
          details: data.details || {},
          lab_id: data.lab_id,
          location_id: data.location_id || null,
          notes: data.notes,
          purchase_date: data.purchase_date
        })
        .returning('*');
      // Log history
      await trx('ict_hardware_history').insert({
        hardware_id: hw.id,
        changed_by: userId,
        action: 'create',
        old_values: {},
        new_values: hw
      });
      await trx.commit();
      return this.findById(hw.id);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },

  async update(id, data, userId) {
    const trx = await db.transaction();
    try {
      const old = await trx('ict_hardware').where({ id, is_deleted: false }).first();
      if (!old) throw new Error('Hardware not found');

      // Build update data
      const updates = {
        asset_id: data.asset_id ?? old.asset_id,
        computer_name: data.computer_name ?? old.computer_name,
        org_serial: data.serial_number ?? data.org_serial ?? old.org_serial,
        type: data.type ?? old.type,
        model: data.model,
        status: data.status ?? old.status,
        office_number: data.office_number ?? old.office_number,
        assigned_to_employee: data.assigned_to_employee ?? old.assigned_to_employee,
        issued_date: data.issued_date !== undefined ? data.issued_date : old.issued_date,
        return_date: data.return_date !== undefined ? data.return_date : old.return_date,
        price: data.price ?? old.price,
        details: data.details ? { ...old.details, ...data.details } : old.details,
        lab_id: data.lab_id ?? old.lab_id,
        location_id: data.location_id !== undefined ? data.location_id : old.location_id,
        notes: data.notes,
        purchase_date: data.purchase_date,
        updated_at: db.fn.now()
      };
      // Handle assignment logic: if assigned_to_employee set, clear return_date, set status to in_use
      if (updates.assigned_to_employee && old.assigned_to_employee !== updates.assigned_to_employee) {
        updates.status = 'in_use';
        updates.issued_date = updates.issued_date || new Date().toISOString().slice(0,10);
        updates.return_date = null;
      } else if (!updates.assigned_to_employee && old.assigned_to_employee !== updates.assigned_to_employee) {
        updates.status = 'available';
        updates.return_date = updates.return_date || new Date().toISOString().slice(0,10);
        updates.issued_date = null;
      }

      await trx('ict_hardware').where({ id }).update(updates);
      const newRecord = await trx('ict_hardware').where({ id }).first();
      await trx('ict_hardware_history').insert({
        hardware_id: id,
        changed_by: userId,
        action: 'update',
        old_values: old,
        new_values: newRecord
      });
      await trx.commit();
      return this.findById(id);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },

  async transfer(id, { to_lab_id, to_location_id, new_computer_name, assigned_to_employee, office_number }, userId) {
    const trx = await db.transaction();
    try {
      const old = await trx('ict_hardware').where({ id, is_deleted: false }).first();
      if (!old) throw new Error('Hardware not found');

      const updates = {};
      if (to_lab_id) updates.lab_id = to_lab_id;
      if (to_location_id !== undefined) updates.location_id = to_location_id;
      if (new_computer_name) updates.computer_name = new_computer_name;
      if (office_number !== undefined) updates.office_number = office_number;
      if (assigned_to_employee !== undefined) {
        updates.assigned_to_employee = assigned_to_employee;
        if (assigned_to_employee) {
          updates.status = 'in_use';
          updates.issued_date = new Date().toISOString().slice(0,10);
          updates.return_date = null;
        } else {
          updates.status = 'available';
          updates.return_date = new Date().toISOString().slice(0,10);
          updates.issued_date = null;
        }
      }
      updates.updated_at = db.fn.now();
      await trx('ict_hardware').where({ id }).update(updates);
      const newRecord = await trx('ict_hardware').where({ id }).first();
      await trx('ict_hardware_history').insert({
        hardware_id: id,
        changed_by: userId,
        action: 'transfer',
        old_values: old,
        new_values: newRecord
      });
      await trx.commit();
      return this.findById(id);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },

  async getHistory(hardwareId) {
    return db('ict_hardware_history')
      .join('users', 'ict_hardware_history.changed_by', 'users.id')
      .where('ict_hardware_history.hardware_id', hardwareId)
      .select('ict_hardware_history.*', 'users.display_name as changed_by_name')
      .orderBy('ict_hardware_history.created_at', 'desc');
  },

  async getByEmployee(name) {
    return db('ict_hardware')
      .leftJoin('labs', 'ict_hardware.lab_id', 'labs.id')
      .where('ict_hardware.assigned_to_employee', 'ilike', `%${name}%`)
      .where('ict_hardware.is_deleted', false)
      .select('ict_hardware.*', 'labs.name as department_name');
  },

  async softDelete(id) {
    return db('ict_hardware').where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
  }
};

module.exports = ICTHardware;