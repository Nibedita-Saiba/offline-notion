require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./db/database');

const pagesRouter = require('./routes/pages');
const blocksRouter = require('./routes/blocks');
const databasesRouter = require('./routes/databases');
const searchRouter = require('./routes/search');
const aiRouter = require('./routes/ai');
const uploadRouter = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const userDataPath = process.env.USER_DATA_PATH || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.offline-notion');
const imagesDir = path.join(userDataPath, 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
app.use('/images', express.static(imagesDir));

app.use('/api/pages', pagesRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/databases', databasesRouter);
app.use('/api/search', searchRouter);
app.use('/api/ai', aiRouter);
app.use('/api/upload', uploadRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize DB first (async), then start server
initializeDatabase().then(() => {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[SERVER] OfflineNotion backend running on http://127.0.0.1:${PORT}`);
  });
}).catch(err => {
  console.error('[FATAL] DB init failed:', err);
  process.exit(1);
});

module.exports = app;
