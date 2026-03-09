const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

router.get('/', (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json([]);

  const results = query(`
    SELECT DISTINCT p.id as page_id, p.title, '' as snippet, p.icon, p.parent_id, p.updated_at
    FROM pages p
    LEFT JOIN blocks b ON b.page_id = p.id
    WHERE p.is_deleted = 0 AND (p.title LIKE ? OR b.content LIKE ?)
    ORDER BY p.updated_at DESC LIMIT 20`,
    [`%${q}%`, `%${q}%`]);

  res.json(results);
});

router.get('/recent', (req, res) => {
  const pages = query(`SELECT id as page_id, title, icon, parent_id, updated_at FROM pages WHERE is_deleted = 0 ORDER BY updated_at DESC LIMIT 10`);
  res.json(pages);
});

module.exports = router;
