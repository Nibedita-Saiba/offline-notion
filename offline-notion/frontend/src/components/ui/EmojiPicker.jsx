import React, { useState, useRef, useEffect } from 'react';

const EMOJI_CATEGORIES = {
  'Common': ['📄', '📝', '📋', '📌', '📍', '📎', '🗂️', '📁', '📂', '🗃️'],
  'Work': ['💼', '📊', '📈', '📉', '💡', '🎯', '✅', '⚡', '🔥', '💪'],
  'Nature': ['🌱', '🌿', '🌊', '🌸', '🌺', '🌻', '🍀', '🍃', '🌙', '⭐'],
  'Objects': ['🔑', '🔒', '🔓', '🎨', '🎭', '🎪', '🎠', '🎡', '🎢', '🎪'],
  'Tech': ['💻', '🖥️', '📱', '⌨️', '🖱️', '🖨️', '📡', '🔭', '🔬', '⚗️'],
  'Fun': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎖️', '🎗️', '🎀', '🎃'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'],
  'Food': ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '☕', '🍵', '🍺', '🍕'],
};

export default function EmojiPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const filteredEmojis = search ? allEmojis.filter(e => e.includes(search)) : null;

  return (
    <div
      ref={ref}
      className="bg-[#1e1e1e] border border-notion-border rounded-xl shadow-2xl w-72 overflow-hidden animate-scale-in"
    >
      <div className="p-2 border-b border-notion-border">
        <input
          className="input w-full text-sm"
          placeholder="Search emoji..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {search ? (
          <div className="flex flex-wrap gap-1">
            {filteredEmojis?.map(emoji => (
              <button
                key={emoji}
                onClick={() => onSelect(emoji)}
                className="text-2xl p-1.5 rounded hover:bg-notion-hover transition-colors"
              >
                {emoji}
              </button>
            ))}
            {filteredEmojis?.length === 0 && (
              <p className="text-xs text-notion-muted p-2">No results</p>
            )}
          </div>
        ) : (
          Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
            <div key={cat} className="mb-2">
              <p className="text-xs font-medium text-notion-muted uppercase tracking-wide mb-1 px-1">{cat}</p>
              <div className="flex flex-wrap gap-0.5">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    className="text-xl p-1 rounded hover:bg-notion-hover transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
