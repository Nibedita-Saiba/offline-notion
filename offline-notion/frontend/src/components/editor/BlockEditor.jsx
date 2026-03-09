import React, { useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlock from '@tiptap/extension-code-block';
import { SlashCommands } from './SlashCommands';
import FloatingToolbar from './FloatingToolbar';
import { uploadApi } from '../../utils/api';

export default function BlockEditor({ content, onChange, pageId }) {
  const debounceRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        history: {
          depth: 100,
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: { class: 'code-block' },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`;
          }
          return "Press '/' for commands...";
        },
        emptyNodeClass: 'is-empty',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ HTMLAttributes: { class: 'editor-image' } }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: false }),
      SlashCommands,
    ],
    content: content || '<p></p>',
    autofocus: 'end',
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange?.(editor.getHTML());
      }, 500);
    },
    editorProps: {
      handleDrop: (view, event) => {
        // Handle image drop
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file, view, event);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        // Handle image paste
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) handleImageUpload(file, view, null);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  const handleImageUpload = useCallback(async (file, view, event) => {
    try {
      const { url } = await uploadApi.image(file);
      if (editor) {
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image. Please try again.');
    }
  }, [editor]);

  // Update content when page changes
  React.useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        editor.commands.setContent(content || '<p></p>', false);
      }
    }
  }, [pageId]);

  return (
    <div className="flex-1 min-h-0 relative">
      <FloatingToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose-editor h-full"
        style={{ minHeight: '100%' }}
      />
    </div>
  );
}
