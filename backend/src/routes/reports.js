const express = require('express');
const router = express.Router();
const db = require('../config/db');
const ExcelJS = require('exceljs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const { authenticate } = require('../middleware/auth');

// Helper: parse dates from query
function getDateRange(query) {
  const from = query.from ? new Date(query.from) : new Date('2000-01-01');
  const to = query.to ? new Date(query.to) : new Date();
  return { from, to };
}

// Shared low‑stock query (no location type filter – includes primary and sub)
async function getLowStockData(labId = null) {
  let sql = `
    SELECT c.id as chemical_id, c.name as chemical, c.cas_number, c.reorder_threshold,
           l.name as location, labs.name as lab,
           COUNT(b.id) as unopened
    FROM chemical_containers b
    JOIN chemicals c ON b.chemical_id = c.id AND c.is_deleted = false
    JOIN locations l ON b.location_id = l.id
    JOIN labs ON l.lab_id = labs.id
    WHERE b.status = 'unopened' AND b.is_deleted = false
  `;
  const params = [];
  if (labId) {
    sql += ` AND labs.id = ?`;
    params.push(labId);
  }
  sql += `
    GROUP BY c.id, c.name, c.cas_number, c.reorder_threshold, l.id, l.name, labs.name
    HAVING COUNT(b.id) <= c.reorder_threshold
    ORDER BY labs.name, l.name, c.name
  `;
  const result = await db.raw(sql, params);
  return result.rows;
}

// ---------- 1. Usage trends ----------
router.get('/usage', authenticate, async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);
    const labId = req.query.lab_id ? parseInt(req.query.lab_id) : null;

    let query = db('transactions')
      .join('chemical_containers', 'transactions.item_id', 'chemical_containers.id')
      .join('chemicals', 'chemical_containers.chemical_id', 'chemicals.id')
      .where('transactions.action_type', 'bottle_opened')
      .whereBetween('transactions.created_at', [from, to])
      .select(
        db.raw("DATE_TRUNC('month', transactions.created_at) as month"),
        'chemicals.id as chemical_id',
        'chemicals.name as chemical_name',
        db.raw('COUNT(*) as bottles_opened')
      )
      .groupBy('month', 'chemicals.id', 'chemicals.name')
      .orderBy('month', 'asc');

    if (labId) {
      query = query
        .join('locations', 'chemical_containers.location_id', 'locations.id')
        .where('locations.lab_id', labId);
    }

    const rows = await query;
    const grouped = {};
    for (const r of rows) {
      const monthKey = r.month.toISOString().slice(0, 7);
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push({
        chemical_id: r.chemical_id,
        chemical_name: r.chemical_name,
        bottles_opened: parseInt(r.bottles_opened)
      });
    }

    res.json({ from, to, data: grouped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate usage report' });
  }
});

// ---------- 2. Restock list (JSON) ----------
router.get('/restock-list', authenticate, async (req, res) => {
  try {
    const labId = req.query.lab_id ? parseInt(req.query.lab_id) : null;
    const data = await getLowStockData(labId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate restock list' });
  }
});

// ---------- 3. Export to Excel (usage + restock) ----------
router.get('/export/excel', authenticate, async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);
    const labId = req.query.lab_id ? parseInt(req.query.lab_id) : null;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NARDI Inventory';

    // Sheet 1: Usage trends
    const usageSheet = workbook.addWorksheet('Usage Trends');
    usageSheet.columns = [
      { header: 'Month', key: 'month', width: 12 },
      { header: 'Chemical', key: 'chemical', width: 25 },
      { header: 'Bottles Opened', key: 'bottles', width: 15 }
    ];

    let usageQuery = db('transactions')
      .join('chemical_containers', 'transactions.item_id', 'chemical_containers.id')
      .join('chemicals', 'chemical_containers.chemical_id', 'chemicals.id')
      .where('transactions.action_type', 'bottle_opened')
      .whereBetween('transactions.created_at', [from, to])
      .select(
        db.raw("DATE_TRUNC('month', transactions.created_at) as month"),
        'chemicals.name as chemical_name',
        db.raw('COUNT(*) as bottles_opened')
      )
      .groupBy('month', 'chemicals.name')
      .orderBy('month', 'asc');

    if (labId) {
      usageQuery = usageQuery
        .join('locations', 'chemical_containers.location_id', 'locations.id')
        .where('locations.lab_id', labId);
    }

    const usageRows = await usageQuery;
    for (const row of usageRows) {
      usageSheet.addRow({
        month: row.month.toISOString().slice(0, 7),
        chemical: row.chemical_name,
        bottles: parseInt(row.bottles_opened)
      });
    }

    // Sheet 2: Restock list
    const restockSheet = workbook.addWorksheet('Restock List');
    restockSheet.columns = [
      { header: 'Chemical', key: 'chemical', width: 25 },
      { header: 'Lab', key: 'lab', width: 20 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Unopened Count', key: 'count', width: 15 },
      { header: 'Threshold', key: 'threshold', width: 12 }
    ];

    const lowStockData = await getLowStockData(labId);
    for (const row of lowStockData) {
      restockSheet.addRow({
        chemical: row.chemical,
        lab: row.lab,
        location: row.location,
        count: parseInt(row.unopened),
        threshold: row.reorder_threshold
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=NARDI_Inventory_Report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Excel export failed' });
  }
});

// ---------- 4. Export to PDF (restock list) ----------
router.get('/export/pdf', authenticate, async (req, res) => {
  try {
    const labId = req.query.lab_id ? parseInt(req.query.lab_id) : null;
    const lowStockData = await getLowStockData(labId);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('NARDI Inventory - Restock List', 14, 20);
    doc.autoTable({
      startY: 30,
      head: [['Chemical', 'Lab', 'Location', 'Unopened', 'Threshold']],
      body: lowStockData.map(r => [
        r.chemical,
        r.lab,
        r.location,
        String(r.unopened),
        String(r.reorder_threshold)
      ])
    });

    const pdfOutput = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Restock_List.pdf');
    res.send(Buffer.from(pdfOutput));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF export failed' });
  }
});

module.exports = router;