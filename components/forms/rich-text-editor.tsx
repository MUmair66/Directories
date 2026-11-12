"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered, Quote, Redo, Undo } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tiptap rich text editor (bold, italic, headings, lists, quotes, links).
 * Output HTML is sanitized again on the server (lib/sanitize.ts).
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  minHeight = 180,
  invalid,
  headings = true,
}: {
  id: string;
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  minHeight?: number;
  invalid?: boolean;
  headings?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: headings ? { levels: [2, 3] } : false, link: { openOnClick: false, autolink: true } })],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-invalid": invalid ? "true" : "false",
        "aria-placeholder": placeholder ?? "",
        class: "prose-content max-w-none px-3 py-2 text-sm outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
  });

  const btn = (active: boolean) =>
    cn("inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40", active && "bg-muted text-foreground");

  return (
    <div className={cn("overflow-hidden rounded-md border bg-card focus-within:outline-2 focus-within:outline-ring/40", invalid ? "border-danger" : "border-input")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface p-1" role="toolbar" aria-label="Formatting">
        <button type="button" className={btn(!!editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold">
          <Bold className="size-4" />
        </button>
        <button type="button" className={btn(!!editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic">
          <Italic className="size-4" />
        </button>
        {headings && (
          <>
            <button type="button" className={btn(!!editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading">
              <Heading2 className="size-4" />
            </button>
            <button type="button" className={btn(!!editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Subheading">
              <Heading3 className="size-4" />
            </button>
          </>
        )}
        <button type="button" className={btn(!!editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()} aria-label="Bulleted list">
          <List className="size-4" />
        </button>
        <button type="button" className={btn(!!editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} aria-label="Numbered list">
          <ListOrdered className="size-4" />
        </button>
        <button type="button" className={btn(!!editor?.isActive("blockquote"))} onClick={() => editor?.chain().focus().toggleBlockquote().run()} aria-label="Quote">
          <Quote className="size-4" />
        </button>
        <button
          type="button"
          className={btn(!!editor?.isActive("link"))}
          onClick={() => {
            const prev = editor?.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL", prev ?? "https://");
            if (url === null) return;
            if (url === "") editor?.chain().focus().unsetLink().run();
            else editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          aria-label="Link"
        >
          <LinkIcon className="size-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <button type="button" className={btn(false)} onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} aria-label="Undo">
          <Undo className="size-4" />
        </button>
        <button type="button" className={btn(false)} onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} aria-label="Redo">
          <Redo className="size-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
