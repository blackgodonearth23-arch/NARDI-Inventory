const express = require('express');
const router = express.Router();
const db = require('../config/db');                     // <-- FIXED path
const { authenticate } = require('../middleware/auth');
const { createExpiryAlerts } = require('../services/alertService');

// All routes require authentication
router.use(authenticate);

// Dashboard summary endpoint
router.get('/summary/:labId', async (req, res, next) => {
  try {
    const { labId } = req.params;

    // Total chemicals (distinct chemical items in this lab)
    const [{ count: totalChemicals }] = await db('chemicals')
      .join('chemical_containers', function() {
        this.on('chemicals.id', 'chemical_containers.chemical_id');
      })
      .where({ 'chemical_containers.location_id': db.raw('?', [labId]), 'chemical_containers.is_deleted': false })
      .countDistinct('chemicals.id as count');

    // Total equipment (available + in_use) – using utility_items
    const [{ count: totalEquipment }] = await db('utility_items')
      .where({ lab_id: labId, type: 'equipment', is_deleted: false })
      .whereIn('status', ['available', 'in_use'])
      .count('id as count');

    // Total utensils
    const [{ count: totalUtensils }] = await db('utility_items')
      .where({ lab_id: labId, type: 'utensil', status: 'available', is_deleted: false })
      .count('id as count');

    // Total ICT hardware
    const [{ count: totalIct }] = await db('utility_items')
      .where({ lab_id: labId, type: 'ict_hardware', status: 'available', is_deleted: false })
      .count('id as count');

    // Broken counts per type
    const brokenCountsQuery = await db('utility_items')
      .where({ lab_id: labId, status: 'broken', is_deleted: false })
      .groupBy('type')
      .select('type')
      .count('id as count');

    const brokenCounts = {
      equipment: 0,
      utensil: 0,
      ict_hardware: 0,
    };
    brokenCountsQuery.forEach(row => {
      if (brokenCounts.hasOwnProperty(row.type)) {
        brokenCounts[row.type] = parseInt(row.count);
      }
    });

    // Recent broken items (last 5)
    const recentBroken = await db('utility_items')
      .where({ lab_id: labId, status: 'broken', is_deleted: false })
      .orderBy('updated_at', 'desc')
      .limit(5)
      .select('id', 'type', 'name', 'updated_at');

    // Available utility counts (all types)
    const availableCountsQuery = await db('utility_items')
      .where({ lab_id: labId, status: 'available', is_deleted: false })
      .groupBy('type')
      .select('type')
      .count('id as count');
    const availableUtilities = availableCountsQuery.map(row => ({
      item_type: row.type,
      count: parseInt(row.count),
    }));

    res.json({
      totalChemicals,
      totalEquipment,
      totalUtensils,
      totalIct,
      brokenCounts,
      recentBroken,
      availableUtilities,
    });
  } catch (err) {
    next(err);
  }
});

// Broken items list with names
router.get('/broken/:labId', async (req, res, next) => {
  try {
    const { labId } = req.params;
    const broken = await db('utility_items')
      .where({ lab_id: labId, status: 'broken', is_deleted: false })
      .select('id', 'name', 'type', 'status');
    res.json(broken);
  } catch (err) {
    next(err);
  }
});

// Available items detail list
router.get('/available-details/:labId', async (req, res, next) => {
  try {
    const { labId } = req.params;
    const items = await db('utility_items')
      .where({ lab_id: labId, status: 'available', is_deleted: false })
      .select('id', 'name', 'type');
    res.json({
      equipment: items.filter(i => i.type === 'equipment'),
      utensils: items.filter(i => i.type === 'utensil'),
      ict_hardware: items.filter(i => i.type === 'ict_hardware'),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;