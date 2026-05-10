const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/db');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

// Create audit report
const createAuditSchema = Joi.object({
  type: Joi.string().valid('chemical', 'utility').required(),
  items: Joi.array().min(1).items(
    Joi.object({
      item_id: Joi.number().integer().required(),
      item_type: Joi.string().valid('chemical', 'utility').required(),
      expected_count: Joi.number().integer().required(),
      actual_count: Joi.number().integer().allow(null).optional(),
      notes: Joi.string().allow('', null).optional()
    })
  ).required(),
  notes: Joi.string().allow('', null).optional()
});

router.post('/', authenticate, authorize('lab_user'), validate(createAuditSchema), async (req, res) => {
  const trx = await db.transaction();
  try {
    const { type, items, notes } = req.body;
    const [report] = await trx('audit_reports').insert({
      lab_id: req.user.lab_id,
      created_by: req.user.id,
      type,
      status: 'pending',
      notes
    }).returning('*');

    const itemRows = items.map(item => ({
      report_id: report.id,
      item_id: item.item_id,
      item_type: item.item_type,
      expected_count: item.expected_count,
      actual_count: item.actual_count,
      notes: item.notes
    }));
    await trx('audit_report_items').insert(itemRows);

    // Notify lab keepers of this lab
    const keepers = await trx('users')
      .where({ lab_id: req.user.lab_id, role: 'lab_keeper', is_active: true })
      .select('id');
    for (const k of keepers) {
      await trx('alerts').insert({
        user_id: k.id,
        type: 'info',
        message: `New audit report submitted by ${req.user.display_name}`,
        reference_type: 'audit',
        reference_id: report.id
      });
    }

    await trx.commit();
    res.status(201).json(report);
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to create audit' });
  }
});

// Get audits for keeper/admin
router.get('/', authenticate, authorize('lab_keeper', 'admin'), async (req, res) => {
  try {
    let query = db('audit_reports')
      .join('users', 'audit_reports.created_by', 'users.id')
      .select('audit_reports.*', 'users.display_name as created_by_name')
      .orderBy('created_at', 'desc');

    if (req.user.role === 'lab_keeper') {
      query = query.where('audit_reports.lab_id', req.user.lab_id);
    }
    const reports = await query;
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// Get audit details
router.get('/:id', authenticate, authorize('lab_keeper', 'admin'), async (req, res) => {
  try {
    const report = await db('audit_reports').where({ id: req.params.id }).first();
    if (!report) return res.status(404).json({ error: 'Audit not found' });
    if (req.user.role === 'lab_keeper' && report.lab_id !== req.user.lab_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const items = await db('audit_report_items').where({ report_id: report.id });
    res.json({ ...report, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit' });
  }
});

// Approve audit – apply changes
router.put('/:id/approve', authenticate, authorize('lab_keeper', 'admin'), async (req, res) => {
  const trx = await db.transaction();
  try {
    const report = await trx('audit_reports').where({ id: req.params.id }).first();
    if (!report || report.status !== 'pending') throw new Error('Invalid audit');

    if (req.user.role === 'lab_keeper' && report.lab_id !== req.user.lab_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = await trx('audit_report_items').where({ report_id: report.id });

    for (const item of items) {
      if (item.actual_count === null) continue;
      const diff = item.actual_count - item.expected_count;
      if (diff === 0) continue;

      if (item.item_type === 'chemical') {
        // Adjust containers: if diff > 0, add containers; if diff < 0, soft-delete some unopened
        if (diff > 0) {
          // Add new containers (no PIN, primary location? We'll add to the first primary location of the lab)
          const primaryLoc = await trx('locations')
            .where({ lab_id: report.lab_id, type: 'primary' })
            .first();
          if (primaryLoc) {
            for (let i = 0; i < diff; i++) {
              await trx('chemical_containers').insert({
                chemical_id: item.item_id,
                location_id: primaryLoc.id,
                status: 'unopened',
                container_type: 'glass_bottle',
                is_deleted: false
              });
            }
          }
        } else {
          // Remove unopened containers (soft delete)
          const toRemove = await trx('chemical_containers')
            .where({ chemical_id: item.item_id, status: 'unopened', is_deleted: false })
            .limit(-diff)
            .select('id');
          for (const cont of toRemove) {
            await trx('chemical_containers').where({ id: cont.id }).update({ is_deleted: true });
          }
        }
      } else if (item.item_type === 'utility') {
        // Update utility total_count
        await trx('utility_items')
          .where({ id: item.item_id })
          .update({ total_count: item.actual_count });
      }
    }

    await trx('audit_reports').where({ id: report.id }).update({ status: 'approved', updated_at: db.fn.now() });
    await trx.commit();
    res.json({ message: 'Audit approved and applied' });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Reject audit
router.put('/:id/reject', authenticate, authorize('lab_keeper', 'admin'), async (req, res) => {
  try {
    const report = await db('audit_reports').where({ id: req.params.id }).first();
    if (!report || report.status !== 'pending') throw new Error('Invalid audit');

    if (req.user.role === 'lab_keeper' && report.lab_id !== req.user.lab_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db('audit_reports').where({ id: report.id }).update({ status: 'rejected', updated_at: db.fn.now() });
    res.json({ message: 'Audit rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;