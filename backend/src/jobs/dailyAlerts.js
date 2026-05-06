const cron = require('node-cron');
const db = require('../config/db');
const { sendMail } = require('../services/mailer');

async function runDailyChecks() {
  console.log('[ALERTS] Running daily checks...');
  const now = new Date();

  try {
    // 1. Low stock – chemicals below reorder threshold per lab location
    // We'll join bottles (unopened) and group by chemical & location, compare to threshold
    const lowStockItems = await db.raw(`
      SELECT c.id as chemical_id, c.name as chemical_name, c.reorder_threshold,
             cl.location_id, l.name as location_name, l.lab_id, labs.name as lab_name,
             COUNT(b.id) as unopened_count
      FROM chemical_bottles b
      JOIN chemicals c ON c.id = b.chemical_id AND c.is_deleted = false
      JOIN locations l ON l.id = b.location_id AND l.type = 'lab_sub'
      JOIN labs ON labs.id = l.lab_id
      WHERE b.status = 'unopened' AND b.is_deleted = false
      GROUP BY c.id, c.name, c.reorder_threshold, l.id, l.name, l.lab_id, labs.name
      HAVING COUNT(b.id) <= c.reorder_threshold
    `);

    // 2. Broken equipment (still broken)
    const brokenEquipment = await db('equipment')
      .where({ status: 'broken', is_deleted: false })
      .select('id', 'name', 'location_id', 'org_serial');

    // 3. Licences expiring within 30 days
    const expiringLicences = await db('software_licenses')
      .where('is_deleted', false)
      .where('expiration_date', '<=', db.raw("CURRENT_DATE + INTERVAL '30 days'"))
      .where('expiration_date', '>=', db.raw('CURRENT_DATE'))
      .select('id', 'name', 'expiration_date', 'license_type');

    // ----- Alert generation -----
    const alerts = [];  // array of { user_id, type, message }

    // 1. Low stock – notify all lab_keepers and admin
    if (lowStockItems.rows.length > 0) {
      const adminUsers = await db('users').where({ role: 'admin', is_active: true }).select('id');
      const keeperUsers = await db('users').where({ role: 'lab_keeper', is_active: true }).select('id');
      const allTargets = [...adminUsers, ...keeperUsers];

      for (const item of lowStockItems.rows) {
        const msg = `Low stock: ${item.chemical_name} in ${item.lab_name} / ${item.location_name} – only ${item.unopened_count} bottle(s) left (threshold ${item.reorder_threshold})`;
        for (const u of allTargets) {
          alerts.push({ user_id: u.id, type: 'low_stock', message: msg });
        }
      }
    }

    // 2. Broken equipment – notify lab_keepers and admin
    if (brokenEquipment.length > 0) {
      const adminUsers = await db('users').where({ role: 'admin', is_active: true }).select('id');
      const keeperUsers = await db('users').where({ role: 'lab_keeper', is_active: true }).select('id');
      const allTargets = [...adminUsers, ...keeperUsers];
      for (const eq of brokenEquipment) {
        const msg = `Broken equipment: ${eq.name} (serial ${eq.org_serial})`;
        for (const u of allTargets) {
          alerts.push({ user_id: u.id, type: 'broken_equipment', message: msg });
        }
      }
    }

    // 3. Licence expiry – notify ict_keeper and admin
    if (expiringLicences.length > 0) {
      const adminUsers = await db('users').where({ role: 'admin', is_active: true }).select('id');
      const ictKeeperUsers = await db('users').where({ role: 'ict_keeper', is_active: true }).select('id');
      const allTargets = [...adminUsers, ...ictKeeperUsers];
      for (const lic of expiringLicences) {
        const dateStr = lic.expiration_date instanceof Date ? lic.expiration_date.toISOString().slice(0,10) : lic.expiration_date;
        const msg = `Licence expiry: ${lic.name} expires on ${dateStr}`;
        for (const u of allTargets) {
          alerts.push({ user_id: u.id, type: 'license_expiry', message: msg });
        }
      }
    }

    if (alerts.length > 0) {
      await db('alerts').insert(alerts);
      console.log(`[ALERTS] Created ${alerts.length} in‑app alerts.`);
    }

    // ----- Email sending (aggregated per user) -----
    // Group alerts by user_id and send one email per user
    const userAlertsMap = {};
    for (const a of alerts) {
      if (!userAlertsMap[a.user_id]) userAlertsMap[a.user_id] = [];
      userAlertsMap[a.user_id].push(a.message);
    }

    for (const [userId, messages] of Object.entries(userAlertsMap)) {
      const user = await db('users').where({ id: userId }).first();
      if (!user) continue;
      const emailBody = `<h3>NARDI Inventory – Daily Alert Summary</h3><ul>${messages.map(m => `<li>${m}</li>`).join('')}</ul>`;
      await sendMail(user.email, 'NARDI Inventory Alerts', emailBody);
    }

  } catch (err) {
    console.error('[ALERTS] Error during daily checks:', err);
  }
}

// Schedule: every day at 08:00
cron.schedule('0 8 * * *', () => {
  runDailyChecks();
});

// For immediate manual testing: expose function (optional)
module.exports = { runDailyChecks };