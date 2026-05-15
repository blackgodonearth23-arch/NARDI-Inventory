const cron = require('node-cron');
const db = require('../config/db');
const { sendMail } = require('../services/mailer');
const { createExpiryAlerts } = require('../services/alertService'); // NEW

async function runDailyChecks() {
  console.log('[ALERTS] Running daily checks...');
  try {
    // 1. Low stock – chemicals below reorder threshold per location (primary + sub)
    const lowStockItems = await db.raw(`
      SELECT c.id as chemical_id, c.name as chemical_name, c.reorder_threshold,
             l.id as location_id, l.name as location_name, l.lab_id, labs.name as lab_name,
             COUNT(b.id) as unopened_count
      FROM chemical_containers b
      JOIN chemicals c ON c.id = b.chemical_id AND c.is_deleted = false
      JOIN locations l ON l.id = b.location_id
      JOIN labs ON labs.id = l.lab_id
      WHERE b.status = 'unopened' AND b.is_deleted = false
      GROUP BY c.id, c.name, c.reorder_threshold, l.id, l.name, l.lab_id, labs.name
      HAVING COUNT(b.id) <= c.reorder_threshold
    `);

    // 2. Broken equipment (using utility_items now)
    const brokenEquipment = await db('utility_items')
      .where({ status: 'broken', is_deleted: false })
      .select('id', 'name', 'location_id', 'org_serial');

    // 3. Licences expiring within 30 days
    const expiringLicences = await db('software_licenses')
      .where('is_deleted', false)
      .where('expiration_date', '<=', db.raw("CURRENT_DATE + INTERVAL '30 days'"))
      .where('expiration_date', '>=', db.raw('CURRENT_DATE'))
      .select('id', 'name', 'expiration_date', 'license_type');

    // 4. Expiring chemicals (NEW)
    const expiringContainers = await db('chemical_containers')
      .join('locations', 'chemical_containers.location_id', 'locations.id')
      .where('chemical_containers.is_deleted', false)
      .whereNotNull('chemical_containers.expiry_date')
      .where('chemical_containers.expiry_date', '<=', db.raw("CURRENT_DATE + INTERVAL '30 days'"))
      .where('chemical_containers.expiry_date', '>=', db.raw('CURRENT_DATE'))
      .select('chemical_containers.*', 'locations.lab_id');

    for (const cont of expiringContainers) {
      await createExpiryAlerts(cont);
    }

    // Helper: insert alert if no unread alert for this user+reference exists
    async function createAlertIfNew(userId, type, message, refType, refId) {
      const exists = await db('alerts')
        .where({ user_id: userId, type, reference_type: refType, reference_id: refId, is_read: false })
        .first();
      if (!exists) {
        await db('alerts').insert({
          user_id: userId,
          type,
          message,
          reference_type: refType,
          reference_id: refId
        });
        return true;
      }
      return false;
    }

    const newAlertsByUser = {};

    // 1. Low stock alerts
    if (lowStockItems.rows.length > 0) {
      const adminUsers = await db('users').where({ role: 'admin', is_active: true }).select('id');
      const keeperUsers = await db('users').where({ role: 'lab_keeper', is_active: true }).select('id');
      const allTargets = [...adminUsers, ...keeperUsers];

      for (const item of lowStockItems.rows) {
        const msg = `Low stock: ${item.chemical_name} in ${item.lab_name} / ${item.location_name} – only ${item.unopened_count} container(s) left (threshold ${item.reorder_threshold})`;
        for (const u of allTargets) {
          const created = await createAlertIfNew(u.id, 'low_stock', msg, 'chemical_location', `${item.chemical_id}_${item.location_id}`);
          if (created) {
            if (!newAlertsByUser[u.id]) newAlertsByUser[u.id] = [];
            newAlertsByUser[u.id].push(msg);
          }
        }
      }
    }

    // 2. Broken equipment alerts
    if (brokenEquipment.length > 0) {
      const adminUsers = await db('users').where({ role: 'admin', is_active: true }).select('id');
      const keeperUsers = await db('users').where({ role: 'lab_keeper', is_active: true }).select('id');
      const allTargets = [...adminUsers, ...keeperUsers];
      for (const eq of brokenEquipment) {
        const msg = `Broken equipment: ${eq.name} (serial ${eq.org_serial})`;
        for (const u of allTargets) {
          const created = await createAlertIfNew(u.id, 'broken_equipment', msg, 'equipment', eq.id);
          if (created) {
            if (!newAlertsByUser[u.id]) newAlertsByUser[u.id] = [];
            newAlertsByUser[u.id].push(msg);
          }
        }
      }
    }

    // 3. Licence expiry alerts
    if (expiringLicences.length > 0) {
      const adminUsers = await db('users').where({ role: 'admin', is_active: true }).select('id');
      const ictKeeperUsers = await db('users').where({ role: 'ict_keeper', is_active: true }).select('id');
      const allTargets = [...adminUsers, ...ictKeeperUsers];
      for (const lic of expiringLicences) {
        const dateStr = lic.expiration_date instanceof Date ? lic.expiration_date.toISOString().slice(0, 10) : lic.expiration_date;
        const msg = `Licence expiry: ${lic.name} expires on ${dateStr}`;
        for (const u of allTargets) {
          const created = await createAlertIfNew(u.id, 'license_expiry', msg, 'license', lic.id);
          if (created) {
            if (!newAlertsByUser[u.id]) newAlertsByUser[u.id] = [];
            newAlertsByUser[u.id].push(msg);
          }
        }
      }
    }

    // Send emails only for new alerts (aggregated per user)
    for (const [userId, messages] of Object.entries(newAlertsByUser)) {
      const user = await db('users').where({ id: userId }).first();
      if (!user) continue;
      const emailBody = `<h3>NARDI Inventory – New Alert Summary</h3><ul>${messages.map(m => `<li>${m}</li>`).join('')}</ul>`;
      await sendMail(user.email, 'NARDI Inventory Alerts', emailBody);
    }

    const totalNew = Object.values(newAlertsByUser).reduce((sum, msgs) => sum + msgs.length, 0);
    console.log(`[ALERTS] Created ${totalNew} new alerts for ${Object.keys(newAlertsByUser).length} users.`);
  } catch (err) {
    console.error('[ALERTS] Error during daily checks:', err);
  }
}

// Schedule: every day at 08:00
cron.schedule('0 8 * * *', () => {
  runDailyChecks();
});

module.exports = { runDailyChecks };