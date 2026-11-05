import { useEffect, type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { Bold, Italic, List, ListOrdered, Heading2, Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DocumentRichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export function DocumentRichEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  editable = true,
  className,
}: DocumentRichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    editable,
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  if (!editor) {
    return (
      <div
        className={cn(
          'flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-muted/20',
          className
        )}
        aria-busy="true"
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading editor…</span>
      </div>
    )
  }

  const toolbarButton = (active: boolean, onClick: () => void, label: string, icon: ReactNode) => (
    <Button
      type="button"
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      className="h-8 w-8 p-0"
      aria-label={label}
      onClick={onClick}
    >
      {icon}
    </Button>
  )

  return (
    <div className={cn('desk-card overflow-hidden', className)}>
      {editable && (
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {toolbarButton(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold', <Bold className="h-4 w-4" />)}
          {toolbarButton(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic', <Italic className="h-4 w-4" />)}
          {toolbarButton(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Heading', <Heading2 className="h-4 w-4" />)}
          {toolbarButton(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Bullet list', <List className="h-4 w-4" />)}
          {toolbarButton(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Numbered list', <ListOrdered className="h-4 w-4" />)}
          {toolbarButton(false, () => {
            const url = window.prompt('Link URL')
            if (!url) return
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }, 'Link', <Link2 className="h-4 w-4" />)}
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none min-h-[240px] p-4 focus:outline-none [&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:outline-none"
      />
    </div>
  )
}
