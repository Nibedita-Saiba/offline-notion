import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search, Plus, ChevronRight, ChevronDown, MoreHorizontal,
  Trash2, Copy, FilePlus, PanelLeftClose, PanelLeft,
  Bot, Settings, Hash
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';

function PageTreeItem({ page, depth = 0 }) {
  const navigate = useNavigate();
  const { pageId } = useParams();
  const { toggleExpanded, isExpanded, createPage, deletePage, updatePage } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(page.title);

  const isActive = pageId === page.id;
  const expanded = isExpanded(page.id);
  const hasChildren = page.children?.length > 0;

  const handleClick = () => {
    navigate(`/page/${page.id}`);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    toggleExpanded(page.id);
  };

  const handleAddChild = async (e) => {
    e.stopPropagation();
    const child = await createPage(page.id, 'Untitled');
    if (child) {
      toggleExpanded(page.id);
      navigate(`/page/${child.id}`);
    }
    setShowMenu(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (confirm(`Delete "${page.title}" and all subpages?`)) {
      await deletePage(page.id);
      if (isActive) navigate('/');
    }
    setShowMenu(false);
  };

  const handleRename = async (e) => {
    e.stopPropagation();
    if (renameValue.trim()) {
      await updatePage(page.id, { title: renameValue.trim() });
    }
    setRenaming(false);
  };

  return (
    <div>
      <div
        className={`group relative flex items-center gap-0.5 pr-1 rounded cursor-pointer select-none transition-colors ${
          isActive ? 'bg-notion-hover text-notion-text' : 'text-notion-muted hover:bg-notion-hover/60 hover:text-notion-text'
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
      >
        {/* Toggle arrow */}
        <button
          onClick={handleToggle}
          className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-3.5 inline-block" />
          )}
        </button>

        {/* Icon + Title */}
        <div className="flex items-center gap-1.5 flex-1 py-1 min-w-0">
          <span className="text-sm flex-shrink-0">{page.icon || '📄'}</span>
          {renaming ? (
            <input
              autoFocus
              className="bg-notion-hover text-notion-text text-sm outline-none rounded px-1 flex-1 min-w-0"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename(e);
                if (e.key === 'Escape') setRenaming(false);
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate flex-1">{page.title || 'Untitled'}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 flex-shrink-0">
          <button
            onClick={handleAddChild}
            className="p-1 rounded hover:bg-white/10 text-notion-muted hover:text-notion-text"
            title="Add subpage"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
            className="p-1 rounded hover:bg-white/10 text-notion-muted hover:text-notion-text"
          >
            <MoreHorizontal size={13} />
          </button>
        </div>

        {/* Context menu */}
        {showMenu && (
          <div
            className="absolute right-0 top-full mt-1 bg-[#1e1e1e] border border-notion-border rounded-lg shadow-xl z-50 min-w-40 py-1 animate-scale-in"
            onMouseLeave={() => setShowMenu(false)}
          >
            <button onClick={(e) => { e.stopPropagation(); setRenaming(true); setShowMenu(false); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-notion-muted hover:text-notion-text hover:bg-notion-hover w-full text-left">
              Rename
            </button>
            <button onClick={handleAddChild}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-notion-muted hover:text-notion-text hover:bg-notion-hover w-full text-left">
              <FilePlus size={13} /> Add subpage
            </button>
            <div className="border-t border-notion-border my-1" />
            <button onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 w-full text-left">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {page.children.map(child => (
            <PageTreeItem key={child.id} page={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar, setSearchOpen, setAiPanelOpen, createPage, getPageTree } = useAppStore();
  const tree = getPageTree();

  const handleNewPage = async () => {
    const page = await createPage(null, 'Untitled');
    if (page) navigate(`/page/${page.id}`);
  };

  if (!sidebarOpen) {
    return (
      <div className="flex flex-col items-center py-3 px-2 border-r border-notion-border bg-notion-sidebar w-12">
        <button onClick={toggleSidebar} className="p-1.5 rounded hover:bg-notion-hover text-notion-muted hover:text-notion-text">
          <PanelLeft size={16} />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex flex-col bg-notion-sidebar border-r border-notion-border w-60 flex-shrink-0 overflow-hidden">
      {/* Workspace header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-notion-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-notion-accent flex items-center justify-center text-white text-xs font-bold">O</div>
          <span className="text-sm font-medium text-notion-text">OfflineNotion</span>
        </div>
        <button onClick={toggleSidebar} className="p-1 rounded hover:bg-notion-hover text-notion-muted hover:text-notion-text">
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-2 py-2 space-y-0.5">
        <button
          onClick={() => setSearchOpen(true)}
          className="sidebar-item w-full justify-start group"
        >
          <Search size={15} className="flex-shrink-0" />
          <span className="flex-1">Search</span>
          <span className="text-xs text-notion-muted/50 opacity-0 group-hover:opacity-100">⌘P</span>
        </button>

        <button
          onClick={handleNewPage}
          className="sidebar-item w-full justify-start group"
        >
          <Plus size={15} className="flex-shrink-0" />
          <span className="flex-1">New Page</span>
          <span className="text-xs text-notion-muted/50 opacity-0 group-hover:opacity-100">⌘N</span>
        </button>

        <button
          onClick={() => setAiPanelOpen(true)}
          className="sidebar-item w-full justify-start"
        >
          <Bot size={15} className="flex-shrink-0" />
          <span className="flex-1">AI Assistant</span>
        </button>
      </div>

      {/* Pages section */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-medium text-notion-muted uppercase tracking-wide">Pages</span>
          <button onClick={handleNewPage} className="p-0.5 rounded hover:bg-notion-hover text-notion-muted hover:text-notion-text">
            <Plus size={13} />
          </button>
        </div>

        {tree.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-notion-muted">No pages yet</p>
            <button onClick={handleNewPage} className="mt-2 text-xs text-notion-blue hover:underline">
              Create your first page
            </button>
          </div>
        ) : (
          tree.map(page => (
            <PageTreeItem key={page.id} page={page} depth={0} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-notion-border">
        <div className="text-xs text-notion-muted/50 text-center">
          OfflineNotion v1.0
        </div>
      </div>
    </aside>
  );
}
