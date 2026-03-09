const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, queryOne } = require('../db/database');

router.get('/page/:pageId', (req, res) => {
  const blocks = query('SELECT * FROM blocks WHERE page_id = ? ORDER BY position ASC', [req.params.pageId]);
  res.json(blocks.map(b => ({ ...b, content: JSON.parse(b.content || '{}') })));
});

router.post('/', (req, res) => {
  const id = uuidv4();
  const { page_id, type = 'paragraph', content = {}, position, parent_block_id = null } = req.body;
  if (!page_id) return res.status(400).json({ error: 'page_id required' });

  if (position !== undefined) {
    run('UPDATE blocks SET position = position + 1 WHERE page_id = ? AND position >= ?', [page_id, position]);
  }

  const posRows = query('SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM blocks WHERE page_id = ?', [page_id]);
  const pos = position ?? posRows[0]?.next_pos ?? 0;

  run(`INSERT INTO blocks (id, page_id, type, content, position, parent_block_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, page_id, type, JSON.stringify(content), pos, parent_block_id]);

  const block = queryOne('SELECT * FROM blocks WHERE id = ?', [id]);
  res.status(201).json({ ...block, content: JSON.parse(block.content || '{}') });
});

router.put('/:id', (req, res) => {
  const block = queryOne('SELECT * FROM blocks WHERE id = ?', [req.params.id]);
  if (!block) return res.status(404).json({ error: 'Block not found' });
  const { type, content, position } = req.body;

  run(`UPDATE blocks SET type = COALESCE(?, type), content = COALESCE(?, content), position = COALESCE(?, position), updated_at = datetime('now') WHERE id = ?`,
    [type ?? null, content !== undefined ? JSON.stringify(content) : null, position ?? null, req.params.id]);

  const updated = queryOne('SELECT * FROM blocks WHERE id = ?', [req.params.id]);
  res.json({ ...updated, content: JSON.parse(updated.content || '{}') });
});

router.put('/batch/update', (req, res) => {
  const { blocks } = req.body;
  blocks.forEach(b => {
    run(`UPDATE blocks SET position = ?, type = ?, content = ?, updated_at = datetime('now') WHERE id = ?`,
      [b.position, b.type, JSON.stringify(b.content || {}), b.id]);
  });
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const block = queryOne('SELECT * FROM blocks WHERE id = ?', [req.params.id]);
  if (!block) return res.status(404).json({ error: 'Block not found' });
  run('DELETE FROM blocks WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
