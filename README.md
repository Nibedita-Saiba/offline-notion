# OfflineNotion

A fully offline, local-first Notion-like productivity workspace built with Electron, React, TipTap, and SQLite.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Electron Shell                    │
│  ┌──────────────────┐    ┌────────────────────────┐ │
│  │  React Frontend  │◄──►│  Express Backend (API)  │ │
│  │  (TipTap Editor) │    │  (Node.js + SQLite)    │ │
│  │  Port: 5173/dist │    │  Port: 3001            │ │
│  └──────────────────┘    └────────────────────────┘ │
│                                ▲                    │
│                          ┌─────┴─────┐             │
│                          │  SQLite   │             │
│                          │  Database │             │
│                          └───────────┘             │
│                                ▲                    │
│                    ┌───────────┴──────────┐        │
│                    │  Ollama (Optional AI) │        │
│                    │  Port: 11434         │        │
│                    └──────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
offline-notion/
├── electron/
│   ├── main.js              # Electron main process
│   └── preload.js           # Context bridge / IPC
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   ├── PageEditor.jsx    # Main editor view
│   │   │   │   ├── BlockEditor.jsx   # TipTap editor
│   │   │   │   ├── FloatingToolbar.jsx
│   │   │   │   └── SlashCommands.jsx
│   │   │   ├── sidebar/
│   │   │   │   └── Sidebar.jsx       # Page tree nav
│   │   │   ├── database/
│   │   │   │   └── DatabaseView.jsx  # Table view
│   │   │   └── ui/
│   │   │       ├── SearchModal.jsx
│   │   │       ├── AIPanel.jsx
│   │   │       └── EmojiPicker.jsx
│   │   ├── store/
│   │   │   └── appStore.js           # Zustand state
│   │   ├── utils/
│   │   │   └── api.js                # API client
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── database.js          # SQLite init + schema
│   │   ├── routes/
│   │   │   ├── pages.js
│   │   │   ├── blocks.js
│   │   │   ├── databases.js
│   │   │   ├── search.js
│   │   │   ├── ai.js                # Ollama integration
│   │   │   └── upload.js
│   │   └── server.js
│   └── package.json
├── assets/
│   └── icon.png
├── package.json
└── README.md
```

---

## Database Schema

```sql
-- pages: Page hierarchy
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  parent_id TEXT,                    -- NULL for root pages
  icon TEXT DEFAULT '📄',
  cover_image TEXT,
  is_deleted INTEGER DEFAULT 0,      -- Soft delete
  position INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- blocks: Rich content blocks per page
CREATE TABLE blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'paragraph',  -- heading, code, list, etc.
  content TEXT DEFAULT '{}',              -- JSON: {html, text}
  position INTEGER DEFAULT 0,
  parent_block_id TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- databases: Table databases embedded in pages
CREATE TABLE databases (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  title TEXT DEFAULT 'Untitled Database',
  view_type TEXT DEFAULT 'table',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- database_properties: Column definitions
CREATE TABLE database_properties (
  id TEXT PRIMARY KEY,
  database_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'text',   -- text|number|date|checkbox|tag
  options TEXT DEFAULT '{}',  -- JSON: {tags: [...]}
  position INTEGER DEFAULT 0,
  created_at TEXT,
  FOREIGN KEY (database_id) REFERENCES databases(id) ON DELETE CASCADE
);

-- database_rows: Row records
CREATE TABLE database_rows (
  id TEXT PRIMARY KEY,
  database_id TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (database_id) REFERENCES databases(id) ON DELETE CASCADE
);

-- database_cells: Cell values
CREATE TABLE database_cells (
  id TEXT PRIMARY KEY,
  row_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  value TEXT DEFAULT '',
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(row_id, property_id),
  FOREIGN KEY (row_id) REFERENCES database_rows(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES database_properties(id) ON DELETE CASCADE
);

-- Full text search virtual table
CREATE VIRTUAL TABLE fts_search USING fts5(
  page_id UNINDEXED,
  title,
  content,
  tokenize="porter unicode61"
);
```

---

## Setup Instructions

### Prerequisites

- Node.js v18+
- npm v9+

### 1. Install Dependencies

```bash
# Clone or extract the project
cd offline-notion

# Install root dependencies (Electron)
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Run in Development Mode

```bash
# From root directory — starts everything concurrently
npm start
```

This starts:
- Backend on `http://127.0.0.1:3001`
- Frontend on `http://localhost:5173`
- Electron window pointing to the frontend

### 3. Build for Production

```bash
npm run build
```

### 4. Package as Desktop App

```bash
# Package for current platform
npm run package

# Output in ./dist/
```

---

## AI Setup (Optional)

### Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from https://ollama.ai/download

### Pull a Model

```bash
# Lightweight and fast (recommended)
ollama pull llama3

# Alternative options
ollama pull mistral
ollama pull phi3
```

### Start Ollama

```bash
ollama serve
```

The AI panel in the app will automatically detect Ollama on `http://127.0.0.1:11434`.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + P` | Open search |
| `⌘/Ctrl + N` | New page |
| `/` | Open block commands |
| `⌘/Ctrl + B` | Bold |
| `⌘/Ctrl + I` | Italic |
| `⌘/Ctrl + U` | Underline |
| `⌘/Ctrl + Z` | Undo |
| `⌘/Ctrl + Shift + Z` | Redo |

---

## Block Types (Slash Commands)

- `Paragraph` — Regular text
- `Heading 1/2/3` — Section headings
- `Bullet List` — Unordered list
- `Numbered List` — Ordered list
- `Task List` — Checkboxes
- `Code Block` — Monospace code
- `Quote` — Blockquote
- `Divider` — Horizontal rule

---

## Data Storage

All data is stored locally:
- **Database:** `~/.offline-notion/workspace.db` (SQLite)
- **Images:** `~/.offline-notion/images/`

---

## Troubleshooting

**Backend not starting:**
```bash
cd backend && npm install && node src/server.js
```

**Port 3001 in use:**
```bash
lsof -ti:3001 | xargs kill
```

**Electron not opening:**
```bash
# Make sure frontend and backend are running first
npm run frontend  # terminal 1
npm run backend   # terminal 2
npm run electron  # terminal 3
```

**AI not working:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Start if not running
ollama serve
```
