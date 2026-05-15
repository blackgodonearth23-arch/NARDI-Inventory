const cron = require('node-cron');
const knex = require('../db/knex');
const { createExpiryAlerts } = require('../services/alertService');

async function checkAllExpiries() {
  try {
    const containers = await knex('containers')
      .where({ item_type: 'chemical', is_deleted: false })
      .whereNotNull('expiry_date')
      .select('*');

    for (const container of containers) {
      await createExpiryAlerts(container);
    }
  } catch (error) {
    console.error('Expiry check error:', error);
  }
}

setImmediate(checkAllExpiries);
cron.schedule('0 0 * * *', checkAllExpiries);

module.exports = { checkAllExpiries };