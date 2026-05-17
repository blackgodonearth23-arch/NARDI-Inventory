const db = require('../config/db');

const PREDEFINED_UTILITY_TYPES = [
  'glassware', 'plasticware', 'equipment', 'instrument',
  'standard', 'consumable_sanitation', 'ppe', 'utensil',
  'supplements', 'media'
];

const Lab = {
  PREDEFINED_UTILITY_TYPES,

  async getAll() {
    return db('labs').select('*').orderBy('name');
  },

  async findById(id) {
    return db('labs').where({ id }).first();
  },

  async create({ name, description, type, allowed_utility_types, type_fields }) {
    const labData = {
      name,
      description: description || null,
      type: type || 'Other'
    };
    if (labData.type !== 'ICT') {
      labData.allowed_utility_types = JSON.stringify(
        allowed_utility_types && Array.isArray(allowed_utility_types)
          ? allowed_utility_types
          : PREDEFINED_UTILITY_TYPES
      );
      labData.type_fields = JSON.stringify(type_fields || {});
    } else {
      labData.allowed_utility_types = null;
      labData.type_fields = null;
    }
    const [lab] = await db('labs').insert(labData).returning('*');
    return this.findById(lab.id);
  },

  async update(id, { name, description, type, allowed_utility_types, type_fields }) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) {
      updates.type = type;
      // if type changed to ICT, clear utility config
      if (type === 'ICT') {
        updates.allowed_utility_types = null;
        updates.type_fields = null;
      } else if (existing.type === 'ICT') {
        updates.allowed_utility_types = JSON.stringify(PREDEFINED_UTILITY_TYPES);
        updates.type_fields = JSON.stringify({});
      }
    }
    if (allowed_utility_types !== undefined) {
      updates.allowed_utility_types = JSON.stringify(allowed_utility_types);
    }
    if (type_fields !== undefined) {
      updates.type_fields = JSON.stringify(type_fields);
    }
    await db('labs').where({ id }).update(updates);
    return this.findById(id);
  },

  async delete(id) {
    return db('labs').where({ id }).del();
  },

  async updateUtilityConfig(id, { allowed_utility_types, type_fields }) {
    const updates = {};
    if (allowed_utility_types !== undefined) {
      updates.allowed_utility_types = JSON.stringify(allowed_utility_types);
    }
    if (type_fields !== undefined) {
      updates.type_fields = JSON.stringify(type_fields);
    }
    await db('labs').where({ id }).update(updates);
    return this.findById(id);
  },

  async getDetailsForUser(labId) {
    if (!labId) return null;
    const lab = await this.findById(labId);
    if (!lab) return null;
    return {
      id: lab.id,
      name: lab.name,
      type: lab.type,
      allowed_utility_types: lab.allowed_utility_types,
      type_fields: lab.type_fields
    };
  }
};

module.exports = Lab;