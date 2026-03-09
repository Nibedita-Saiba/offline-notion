const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, queryOne } = require('../db/database');

router.get('/', (req, res) => {
  const pages = query(`SELECT id, title, icon, cover_image, parent_id, position, created_at, updated_at FROM pages WHERE is_deleted = 0 ORDER BY position ASC`);
  res.json(pages);
});

router.get('/:id', (req, res) => {
  const page = queryOne('SELECT * FROM pages WHERE id = ? AND is_deleted = 0', [req.params.id]);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json(page);
});

router.post('/', (req, res) => {
  const id = uuidv4();
  const { title = 'Untitled', parent_id = null, icon = '📄' } = req.body;
  const existing = query('SELECT COALESCE(MAX(position), -1) as max_pos FROM pages WHERE parent_id IS ?', [parent_id]);
  const pos = (existing[0]?.max_pos ?? -1) + 1;

  run(`INSERT INTO pages (id, title, parent_id, icon, position) VALUES (?, ?, ?, ?, ?)`, [id, title, parent_id, icon, pos]);

  const blockId = uuidv4();
  run(`INSERT INTO blocks (id, page_id, type, content, position) VALUES (?, ?, 'paragraph', '{"html":"<p></p>","text":""}', 0)`, [blockId, id]);

  const page = queryOne('SELECT * FROM pages WHERE id = ?', [id]);
  res.status(201).json(page);
});

router.put('/:id', (req, res) => {
  const page = queryOne('SELECT * FROM pages WHERE id = ?', [req.params.id]);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  const { title, icon, cover_image, parent_id, position } = req.body;

  run(`UPDATE pages SET
    title = COALESCE(?, title),
    icon = COALESCE(?, icon),
    cover_image = COALESCE(?, cover_image),
    parent_id = ?,
    position = COALESCE(?, position),
    updated_at = datetime('now')
    WHERE id = ?`,
    [title ?? null, icon ?? null, cover_image ?? null,
     parent_id !== undefined ? parent_id : page.parent_id,
     position ?? null, req.params.id]);

  const updated = queryOne('SELECT * FROM pages WHERE id = ?', [req.params.id]);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const deletePageAndChildren = (pageId) => {
    const children = query('SELECT id FROM pages WHERE parent_id = ?', [pageId]);
    children.forEach(child => deletePageAndChildren(child.id));
    run('UPDATE pages SET is_deleted = 1 WHERE id = ?', [pageId]);
  };
  deletePageAndChildren(req.params.id);
  res.json({ success: true });
});

router.post('/:id/duplicate', (req, res) => {
  const sourcePage = queryOne('SELECT * FROM pages WHERE id = ?', [req.params.id]);
  if (!sourcePage) return res.status(404).json({ error: 'Page not found' });
  const newId = uuidv4();
  const maxPos = query('SELECT COALESCE(MAX(position), -1) as max_pos FROM pages WHERE parent_id IS ?', [sourcePage.parent_id]);
  run(`INSERT INTO pages (id, title, parent_id, icon, position) VALUES (?, ?, ?, ?, ?)`,
    [newId, `${sourcePage.title} (Copy)`, sourcePage.parent_id, sourcePage.icon, (maxPos[0]?.max_pos ?? -1) + 1]);
  const blocks = query('SELECT * FROM blocks WHERE page_id = ? ORDER BY position', [req.params.id]);
  blocks.forEach(block => {
    run(`INSERT INTO blocks (id, page_id, type, content, position) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), newId, block.type, block.content, block.position]);
  });
  const newPage = queryOne('SELECT * FROM pages WHERE id = ?', [newId]);
  res.status(201).json(newPage);
});

module.exports = router;
