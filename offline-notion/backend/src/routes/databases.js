const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, queryOne } = require('../db/database');

function buildDatabase(database) {
  const properties = query('SELECT * FROM database_properties WHERE database_id = ? ORDER BY position', [database.id]);
  const rows = query('SELECT * FROM database_rows WHERE database_id = ? ORDER BY position', [database.id]);
  const cells = query(`SELECT dc.* FROM database_cells dc JOIN database_rows dr ON dc.row_id = dr.id WHERE dr.database_id = ?`, [database.id]);
  const cellsByRow = {};
  cells.forEach(cell => {
    if (!cellsByRow[cell.row_id]) cellsByRow[cell.row_id] = {};
    cellsByRow[cell.row_id][cell.property_id] = cell.value;
  });
  return { ...database, properties, rows: rows.map(row => ({ ...row, cells: cellsByRow[row.id] || {} })) };
}

router.get('/page/:pageId', (req, res) => {
  const database = queryOne('SELECT * FROM databases WHERE page_id = ?', [req.params.pageId]);
  if (!database) return res.json(null);
  res.json(buildDatabase(database));
});

router.get('/:id', (req, res) => {
  const database = queryOne('SELECT * FROM databases WHERE id = ?', [req.params.id]);
  if (!database) return res.status(404).json({ error: 'Not found' });
  res.json(buildDatabase(database));
});

router.post('/', (req, res) => {
  const id = uuidv4();
  const { page_id, title = 'Untitled Database' } = req.body;
  if (!page_id) return res.status(400).json({ error: 'page_id required' });

  run(`INSERT INTO databases (id, page_id, title) VALUES (?, ?, ?)`, [id, page_id, title]);

  const nameId = uuidv4(), statusId = uuidv4(), dateId = uuidv4();
  run(`INSERT INTO database_properties (id, database_id, name, type, options, position) VALUES (?, ?, 'Name', 'text', '{}', 0)`, [nameId, id]);
  run(`INSERT INTO database_properties (id, database_id, name, type, options, position) VALUES (?, ?, 'Status', 'tag', ?, 1)`,
    [statusId, id, JSON.stringify({ tags: ['Todo', 'In Progress', 'Done'] })]);
  run(`INSERT INTO database_properties (id, database_id, name, type, options, position) VALUES (?, ?, 'Date', 'date', '{}', 2)`, [dateId, id]);

  const database = queryOne('SELECT * FROM databases WHERE id = ?', [id]);
  res.status(201).json(buildDatabase(database));
});

router.put('/:id', (req, res) => {
  const { title, view_type } = req.body;
  run(`UPDATE databases SET title = COALESCE(?, title), view_type = COALESCE(?, view_type), updated_at = datetime('now') WHERE id = ?`,
    [title ?? null, view_type ?? null, req.params.id]);
  res.json(queryOne('SELECT * FROM databases WHERE id = ?', [req.params.id]));
});

router.post('/:id/properties', (req, res) => {
  const propId = uuidv4();
  const { name, type = 'text', options = {} } = req.body;
  const maxPos = query('SELECT COALESCE(MAX(position), -1) as max_pos FROM database_properties WHERE database_id = ?', [req.params.id]);
  run(`INSERT INTO database_properties (id, database_id, name, type, options, position) VALUES (?, ?, ?, ?, ?, ?)`,
    [propId, req.params.id, name, type, JSON.stringify(options), (maxPos[0]?.max_pos ?? -1) + 1]);
  res.status(201).json(queryOne('SELECT * FROM database_properties WHERE id = ?', [propId]));
});

router.put('/:id/properties/:propId', (req, res) => {
  const { name, type, options } = req.body;
  run(`UPDATE database_properties SET name = COALESCE(?, name), type = COALESCE(?, type), options = COALESCE(?, options) WHERE id = ? AND database_id = ?`,
    [name ?? null, type ?? null, options !== undefined ? JSON.stringify(options) : null, req.params.propId, req.params.id]);
  res.json(queryOne('SELECT * FROM database_properties WHERE id = ?', [req.params.propId]));
});

router.delete('/:id/properties/:propId', (req, res) => {
  run('DELETE FROM database_properties WHERE id = ? AND database_id = ?', [req.params.propId, req.params.id]);
  res.json({ success: true });
});

router.post('/:id/rows', (req, res) => {
  const rowId = uuidv4();
  const maxPos = query('SELECT COALESCE(MAX(position), -1) as max_pos FROM database_rows WHERE database_id = ?', [req.params.id]);
  run(`INSERT INTO database_rows (id, database_id, position) VALUES (?, ?, ?)`,
    [rowId, req.params.id, (maxPos[0]?.max_pos ?? -1) + 1]);
  const properties = query('SELECT id FROM database_properties WHERE database_id = ?', [req.params.id]);
  properties.forEach(prop => {
    run(`INSERT OR IGNORE INTO database_cells (id, row_id, property_id, value) VALUES (?, ?, ?, '')`, [uuidv4(), rowId, prop.id]);
  });
  const row = queryOne('SELECT * FROM database_rows WHERE id = ?', [rowId]);
  const cells = query('SELECT * FROM database_cells WHERE row_id = ?', [rowId]);
  const cellMap = {};
  cells.forEach(c => { cellMap[c.property_id] = c.value; });
  res.status(201).json({ ...row, cells: cellMap });
});

router.put('/:id/rows/:rowId/cells/:propId', (req, res) => {
  const { value } = req.body;
  run(`INSERT INTO database_cells (id, row_id, property_id, value, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(row_id, property_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [uuidv4(), req.params.rowId, req.params.propId, value ?? '']);
  res.json({ success: true });
});

router.delete('/:id/rows/:rowId', (req, res) => {
  run('DELETE FROM database_rows WHERE id = ? AND database_id = ?', [req.params.rowId, req.params.id]);
  res.json({ success: true });
});

module.exports = router;
