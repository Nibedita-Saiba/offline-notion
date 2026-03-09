import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Share, Star, Clock, ChevronRight, Bot, Table, Image, Smile } from 'lucide-react';
import BlockEditor from './BlockEditor';
import DatabaseView from '../database/DatabaseView';
import AIPanel from '../ui/AIPanel';
import EmojiPicker from '../ui/EmojiPicker';
import { useAppStore } from '../../store/appStore';
import { blocksApi, pagesApi, databasesApi } from '../../utils/api';
import { format } from 'date-fns';

export default function PageEditor({ pageId }) {
  const navigate = useNavigate();
  const { getPage, updatePage, getBreadcrumb, setAiPanelOpen, aiPanelOpen } = useAppStore();

  const [page, setPage] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [database, setDatabase] = useState(null);

  const titleRef = useRef(null);
  const debounceRef = useRef(null);
  const contentDebounceRef = useRef(null);

  const breadcrumb = getBreadcrumb(pageId);

  // Load page data
  useEffect(() => {
    if (!pageId) return;
    setLoading(true);

    const loadPage = async () => {
      try {
        const [pageData, blocks, db] = await Promise.all([
          pagesApi.getById(pageId),
          blocksApi.getByPage(pageId),
          databasesApi.getByPage(pageId).catch(() => null),
        ]);

        setPage(pageData);
        setDatabase(db);

        // Convert blocks to HTML content
        if (blocks && blocks.length > 0) {
          // Use TipTap JSON if available, otherwise HTML
          const mainBlock = blocks[0];
          if (mainBlock?.content?.html) {
            setContent(mainBlock.content.html);
          } else if (mainBlock?.content?.text) {
            setContent(`<p>${mainBlock.content.text}</p>`);
          } else {
            setContent('<p></p>');
          }
        } else {
          setContent('<p></p>');
        }
      } catch (err) {
        console.error('Failed to load page:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [pageId]);

  // Save content (debounced)
  const handleContentChange = useCallback((html) => {
    setContent(html);
    if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
    contentDebounceRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        // Get or create main content block
        const blocks = await blocksApi.getByPage(pageId);
        if (blocks.length > 0) {
          await blocksApi.update(blocks[0].id, {
            type: 'paragraph',
            content: { html, text: html.replace(/<[^>]*>/g, ' ').trim() }
          });
        } else {
          await blocksApi.create({
            page_id: pageId,
            type: 'paragraph',
            content: { html, text: html.replace(/<[^>]*>/g, ' ').trim() },
            position: 0
          });
        }
      } catch (err) {
        console.error('Failed to save content:', err);
      } finally {
        setSaving(false);
      }
    }, 1000);
  }, [pageId]);

  // Save title (debounced)
  const handleTitleChange = useCallback((title) => {
    setPage(p => ({ ...p, title }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updatePage(pageId, { title });
    }, 500);
  }, [pageId, updatePage]);

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus editor
      document.querySelector('.ProseMirror')?.focus();
    }
  };

  const handleIconChange = async (emoji) => {
    setPage(p => ({ ...p, icon: emoji }));
    setShowEmojiPicker(false);
    await updatePage(pageId, { icon: emoji });
  };

  const handleAddDatabase = async () => {
    const db = await databasesApi.create({ page_id: pageId, title: 'Database' });
    setDatabase(db);
    setShowMenu(false);
  };

  const getPageContent = () => {
    return content.replace(/<[^>]*>/g, ' ').trim();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-notion-muted text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-notion-muted">Page not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-notion-border flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-notion-muted overflow-hidden">
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={crumb.id}>
                {i > 0 && <ChevronRight size={12} className="flex-shrink-0" />}
                <button
                  onClick={() => navigate(`/page/${crumb.id}`)}
                  className={`hover:text-notion-text truncate max-w-32 transition-colors ${
                    i === breadcrumb.length - 1 ? 'text-notion-text' : ''
                  }`}
                >
                  {crumb.icon} {crumb.title || 'Untitled'}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {saving && (
              <span className="text-xs text-notion-muted animate-pulse">Saving...</span>
            )}
            <button
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
              className={`btn-ghost text-xs ${aiPanelOpen ? 'text-notion-blue' : ''}`}
              title="AI Assistant"
            >
              <Bot size={15} />
              <span className="hidden sm:inline">AI</span>
            </button>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="btn-ghost"
            >
              <MoreHorizontal size={15} />
            </button>

            {showMenu && (
              <div className="absolute right-4 top-12 bg-[#1e1e1e] border border-notion-border rounded-lg shadow-xl z-50 min-w-48 py-1 animate-scale-in">
                <button onClick={handleAddDatabase}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-notion-muted hover:text-notion-text hover:bg-notion-hover w-full text-left">
                  <Table size={14} /> Add database
                </button>
                <button onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-notion-muted hover:text-notion-text hover:bg-notion-hover w-full text-left">
                  <Clock size={14} /> Updated {format(new Date(page.updated_at), 'MMM d, yyyy')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-16 py-12">
            {/* Page icon */}
            <div className="relative mb-2">
              <button
                onClick={() => setShowEmojiPicker(v => !v)}
                className="text-5xl hover:opacity-80 transition-opacity cursor-pointer p-1 rounded"
                title="Change icon"
              >
                {page.icon || '📄'}
              </button>

              {showEmojiPicker && (
                <div className="absolute top-14 left-0 z-50">
                  <EmojiPicker onSelect={handleIconChange} onClose={() => setShowEmojiPicker(false)} />
                </div>
              )}
            </div>

            {/* Page title */}
            <textarea
              ref={titleRef}
              className="page-title-input w-full mb-6"
              value={page.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled"
              rows={1}
              style={{ height: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />

            {/* Block editor */}
            <BlockEditor
              content={content}
              onChange={handleContentChange}
              pageId={pageId}
            />

            {/* Database section */}
            {database && (
              <div className="mt-8">
                <DatabaseView
                  database={database}
                  onUpdate={setDatabase}
                />
              </div>
            )}

            {/* Add database button if no database */}
            {!database && (
              <div className="mt-8 pt-4 border-t border-notion-border/50">
                <button
                  onClick={handleAddDatabase}
                  className="flex items-center gap-2 text-sm text-notion-muted hover:text-notion-text transition-colors"
                >
                  <Table size={14} />
                  Add a database
                </button>
              </div>
            )}

            {/* Bottom padding */}
            <div className="h-32" />
          </div>
        </div>
      </div>

      {/* AI Panel */}
      {aiPanelOpen && (
        <AIPanel
          pageContent={getPageContent()}
          pageTitle={page.title}
          onClose={() => setAiPanelOpen(false)}
        />
      )}
    </div>
  );
}
