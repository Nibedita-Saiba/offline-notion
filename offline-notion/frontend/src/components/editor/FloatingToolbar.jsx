import React from 'react';
import { BubbleMenu } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Code,
  Link, Highlighter, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

export default function FloatingToolbar({ editor }) {
  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, placement: 'top' }}
      className="floating-toolbar"
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`toolbar-btn font-bold ${editor.isActive('bold') ? 'is-active' : ''}`}
        title="Bold (⌘B)"
      >
        <Bold size={14} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
        title="Italic (⌘I)"
      >
        <Italic size={14} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
        title="Underline (⌘U)"
      >
        <Underline size={14} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`}
        title="Inline code"
      >
        <Code size={14} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`toolbar-btn ${editor.isActive('highlight') ? 'is-active' : ''}`}
        title="Highlight"
      >
        <Highlighter size={14} />
      </button>

      <div className="w-px h-4 bg-notion-border mx-0.5" />

      <button
        onClick={setLink}
        className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
        title="Link"
      >
        <Link size={14} />
      </button>

      <div className="w-px h-4 bg-notion-border mx-0.5" />

      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
        title="Align left"
      >
        <AlignLeft size={14} />
      </button>

      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
        title="Align center"
      >
        <AlignCenter size={14} />
      </button>

      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
        title="Align right"
      >
        <AlignRight size={14} />
      </button>
    </BubbleMenu>
  );
}
