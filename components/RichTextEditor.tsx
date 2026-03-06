"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  editable?: boolean
}

const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:']

export default function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        protocols: ['http', 'https', 'mailto'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[200px] px-4 py-2',
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  const handleSetLink = () => {
    const url = window.prompt('Enter URL:')
    if (!url) return

    try {
      const parsed = new URL(url)
      if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        window.alert('Only http, https, and mailto URLs are allowed.')
        return
      }
      editor.chain().focus().setLink({ href: url }).run()
    } catch {
      window.alert('Please enter a valid URL (e.g., https://example.com)')
    }
  }

  return (
    <div className="border border-gray-300 rounded-md">
      {editable && (
        <div className="border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('bold') ? 'bg-brand-gold-light text-brand-brown' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('italic') ? 'bg-brand-gold-light text-brand-brown' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('heading', { level: 2 }) ? 'bg-brand-gold-light text-brand-brown' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('heading', { level: 3 }) ? 'bg-brand-gold-light text-brand-brown' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('bulletList') ? 'bg-brand-gold-light text-brand-brown' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Bullet List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('orderedList') ? 'bg-brand-gold-light text-brand-brown' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Numbered List
          </button>
          <button
            type="button"
            onClick={handleSetLink}
            className={`px-3 py-1 rounded text-sm ${
              editor.isActive('link') ? 'bg-brand-gold-light text-brand-brown' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Link
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
