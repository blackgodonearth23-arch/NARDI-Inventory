const db = require('../config/db');

const EXPIRY_THRESHOLD_DAYS = 30;

async function createExpiryAlerts(container) {
  if (!container.expiry_date) return;

  const today = new Date();
  const expiryDate = new Date(container.expiry_date);
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= EXPIRY_THRESHOLD_DAYS && diffDays >= 0) {
    const labUsers = await db('users')
      .where({ lab_id: container.lab_id, is_active: true })
      .select('id');

    for (const user of labUsers) {
      const exists = await db('alerts')
        .where({
          user_id: user.id,
          reference_type: 'chemical_container',
          reference_id: container.id,
          type: 'expiring_chemical',
          is_read: false,
        })
        .first();

      if (!exists) {
        await db('alerts').insert({
          user_id: user.id,
          type: 'expiring_chemical',
          message: `Chemical container ID ${container.id} expires on ${container.expiry_date}`,
          reference_type: 'chemical_container',
          reference_id: container.id,
          is_read: false,
        });
      }
    }
  }
}

module.exports = { createExpiryAlerts };