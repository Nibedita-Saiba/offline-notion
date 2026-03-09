import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, FileText, X } from 'lucide-react';
import { searchApi } from '../../utils/api';
import { useAppStore } from '../../store/appStore';

export default function SearchModal({ onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    searchApi.recent().then(setRecent).catch(() => {});
  }, []);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchApi.search(q);
      setResults(data);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(query), 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, handleSearch]);

  const displayItems = query.trim() ? results : recent;

  const handleSelect = (item) => {
    navigate(`/page/${item.page_id}`);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, displayItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayItems[selectedIndex]) handleSelect(displayItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1e1e1e] border border-notion-border rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-notion-border">
          <Search size={16} className="text-notion-muted flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-notion-text text-sm outline-none placeholder-notion-muted"
            placeholder="Search pages..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-notion-muted border-t-notion-blue rounded-full animate-spin flex-shrink-0" />
          )}
          <button onClick={onClose} className="text-notion-muted hover:text-notion-text">
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!query.trim() && recent.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-medium text-notion-muted uppercase tracking-wide flex items-center gap-1.5">
                <Clock size={11} /> Recent
              </p>
            </div>
          )}

          {displayItems.length === 0 && query.trim() && !loading && (
            <div className="px-4 py-8 text-center text-sm text-notion-muted">
              No results for "{query}"
            </div>
          )}

          {displayItems.map((item, idx) => (
            <button
              key={item.page_id}
              onClick={() => handleSelect(item)}
              className={`flex items-start gap-3 px-4 py-3 w-full text-left transition-colors ${
                idx === selectedIndex ? 'bg-notion-hover' : 'hover:bg-notion-hover/60'
              }`}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{item.icon || '📄'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-notion-text truncate">
                  {item.title || 'Untitled'}
                </div>
                {item.snippet && (
                  <div
                    className="text-xs text-notion-muted mt-0.5 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: item.snippet }}
                  />
                )}
              </div>
              <FileText size={13} className="text-notion-muted flex-shrink-0 mt-1" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-notion-border">
          <span className="text-xs text-notion-muted flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-notion-hover rounded text-xs font-mono">↵</kbd> to open
          </span>
          <span className="text-xs text-notion-muted flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-notion-hover rounded text-xs font-mono">↑↓</kbd> navigate
          </span>
          <span className="text-xs text-notion-muted flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-notion-hover rounded text-xs font-mono">ESC</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
