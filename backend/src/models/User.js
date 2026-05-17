const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  async findByEmail(email) {
    return db('users').where({ email, is_active: true }).first();
  },

  async findById(id) {
    return db('users').where({ id, is_active: true }).first();
  },

  async findByPin(pin, labId = null) {
    let query = db('users')
      .where({ role: 'lab_user', is_active: true })
      .whereNotNull('pin_4_hash');
    if (labId) query = query.andWhere({ lab_id: labId });
    const users = await query;
    for (const user of users) {
      if (await bcrypt.compare(pin, user.pin_4_hash)) {
        return user;
      }
    }
    return null;
  },

  async create({ email, password, display_name, role, lab_id, pin_4 }) {
    const password_hash = await bcrypt.hash(password, 12);
    let pin_4_hash = null;
    if (pin_4 && role === 'lab_user') {
      pin_4_hash = await bcrypt.hash(pin_4, 8);   // lower cost for 4‑digit PIN
    }
    const [result] = await db('users')
      .insert({
        email,
        password_hash,
        display_name,
        role,
        lab_id: lab_id || null,
        pin_4_hash
      })
      .returning('id');
    return this.findById(result.id);
  },

  async updatePassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, 12);
    return db('users').where({ id }).update({ password_hash: hash });
  },

  async updatePin(id, pin_4) {
    if (!pin_4 || pin_4.length !== 4 || !/^\d{4}$/.test(pin_4)) {
      throw new Error('PIN must be exactly 4 digits');
    }
    const pin_4_hash = await bcrypt.hash(pin_4, 8);   // lower cost
    return db('users').where({ id }).update({ pin_4_hash });
  },
 
async getAllActive() {
  return db('users').where({ is_active: true }).select('*');
},

async update(id, fields) {
  const allowed = ['email','display_name','role','lab_id','is_active'];
  const data = {};
  allowed.forEach(f => { if (fields[f] !== undefined) data[f] = fields[f]; });
  data.updated_at = db.fn.now();
  await db('users').where({ id }).update(data);
},

async updatePin(userId, newPin) {
  const hashed = await bcrypt.hash(newPin, 10);
  return db('users').where({ id: userId }).update({ pin_4: newPin });
},

async deactivate(id) {
  return db('users').where({ id }).update({ is_active: false, updated_at: db.fn.now() });
}
};

module.exports = User;