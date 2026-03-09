const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let db;
let dbPath;

function getDbPath() {
  const userDataPath = process.env.USER_DATA_PATH ||
    path.join(process.env.USERPROFILE || process.env.HOME || '.', '.offline-notion');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'workspace.db');
}

function saveDb() {
  if (!db || !dbPath) return;
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (err) {
    console.error('[DB] Save error:', err.message);
  }
}

setInterval(saveDb, 5000);

async function initializeDatabase() {
  const SQL = await initSqlJs();
  dbPath = getDbPath();
  console.log(`[DB] Database path: ${dbPath}`);

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('[DB] Created new database');
  }

  db.run('PRAGMA foreign_keys = ON;');

  db.run(`CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled',
    parent_id TEXT,
    icon TEXT DEFAULT '📄',
    cover_image TEXT,
    is_deleted INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'paragraph',
    content TEXT DEFAULT '{}',
    position INTEGER DEFAULT 0,
    parent_block_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS databases (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Database',
    description TEXT DEFAULT '',
    view_type TEXT DEFAULT 'table',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS database_properties (
    id TEXT PRIMARY KEY,
    database_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    options TEXT DEFAULT '{}',
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS database_rows (
    id TEXT PRIMARY KEY,
    database_id TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS database_cells (
    id TEXT PRIMARY KEY,
    row_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    value TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(row_id, property_id)
  );`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_db_rows ON database_rows(database_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_db_cells_row ON database_cells(row_id);`);

  const result = db.exec('SELECT COUNT(*) FROM pages');
  const count = result[0]?.values[0][0] || 0;

  if (count === 0) {
    const pageId = uuidv4();
    const blockId = uuidv4();
    db.run(`INSERT INTO pages (id, title, icon, position) VALUES (?, 'Welcome to OfflineNotion', '👋', 0)`, [pageId]);
    db.run(`INSERT INTO blocks (id, page_id, type, content, position) VALUES (?, ?, 'paragraph', ?, 0)`,
      [blockId, pageId, JSON.stringify({ html: '<p>Start writing here. Use / for commands.</p>', text: 'Start writing here.' })]);
    saveDb();
  }

  console.log('[DB] Initialized successfully');
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function query(sql, params = []) {
  const database = getDb();
  try {
    const stmt = database.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (err) {
    console.error('[DB Query Error]', err.message);
    throw err;
  }
}

function run(sql, params = []) {
  const database = getDb();
  try {
    database.run(sql, params);
    saveDb();
  } catch (err) {
    console.error('[DB Run Error]', err.message);
    throw err;
  }
}

function queryOne(sql, params = []) {
  return query(sql, params)[0] || null;
}

module.exports = { initializeDatabase, getDb, query, run, queryOne, saveDb };
