const db = require('../config/db');

const SoftwareLicense = {
  async getAll() {
    const licenses = await db('software_licenses').where({ is_deleted: false }).select('*');
    for (const lic of licenses) {
      if (lic.license_type === 'individual') {
        const used = await db('license_assignments')
          .where({ license_id: lic.id })
          .count('*', { as: 'count' });
        lic.seats_used = Number(used[0].count);
      } else {
        lic.seats_used = null;
      }
    }
    return licenses;
  },

  async findById(id) {
    const lic = await db('software_licenses').where({ id, is_deleted: false }).first();
    if (!lic) return null;
    if (lic.license_type === 'individual') {
      const used = await db('license_assignments')
        .where({ license_id: lic.id })
        .count('*', { as: 'count' });
      lic.seats_used = Number(used[0].count);
      lic.assignments = await db('license_assignments')
        .join('users', 'license_assignments.user_id', 'users.id')
        .where({ license_id: lic.id })
        .select('users.id', 'users.email', 'users.display_name');
    }
    return lic;
  },

  async create(data) {
    const [lic] = await db('software_licenses').insert(data).returning('*');
    return lic;
  },

  async update(id, data) {
    await db('software_licenses').where({ id }).update(data);
    return this.findById(id);
  },

  async softDelete(id) {
    return db('software_licenses').where({ id }).update({ is_deleted: true });
  },

  // Individual license assignment
  async assignUsers(licenseId, userIds) {
    const lic = await this.findById(licenseId);
    if (!lic || lic.license_type !== 'individual') throw new Error('Invalid license');
    const currentAssignments = await db('license_assignments')
      .where({ license_id: licenseId })
      .pluck('user_id');
    const toAdd = userIds.filter(id => !currentAssignments.includes(id));
    const toRemove = currentAssignments.filter(id => !userIds.includes(id));
    if (toAdd.length > 0) {
      const insertData = toAdd.map(userId => ({ license_id: licenseId, user_id: userId }));
      await db('license_assignments').insert(insertData);
    }
    if (toRemove.length > 0) {
      await db('license_assignments').where({ license_id: licenseId }).whereIn('user_id', toRemove).del();
    }
    if (lic.total_seats < userIds.length) throw new Error('Not enough seats');
    return this.findById(licenseId);
  }
};

module.exports = SoftwareLicense;