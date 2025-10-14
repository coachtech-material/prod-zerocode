"use client";
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { common, createLowlight } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Node } from '@tiptap/core';
import { createClient } from '@/lib/supabase/client';
import { mdToSafeHtml } from '@/lib/markdown';

type Props = {
  initialMarkdown: string;
  formId: string;
  fieldId: string;
  sectionId: string;
};

const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'video' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', { ...HTMLAttributes, controls: 'true' }];
  },
});

function dispatchToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
  }
}

function toMarkdown(json: any): string {
  const out: string[] = [];
  function escapeInline(s: string) {
    return s.replace(/[\*`_\[\]]/g, (m) => `\\${m}`);
  }
  function textWithMarks(node: any): string {
    let t = escapeInline(node.text || '');
    if (node.marks) {
      for (const m of node.marks) {
        if (m.type === 'bold') t = `**${t}**`;
        if (m.type === 'italic') t = `*${t}*`;
        if (m.type === 'code') t = `\`${t}\``;
        if (m.type === 'link') t = `[${t}](${m.attrs?.href || ''})`;
      }
    }
    return t;
  }
  function walk(node: any, prefix = '') {
    switch (node.type) {
      case 'doc':
        node.content?.forEach((n: any) => walk(n));
        break;
      case 'paragraph': {
        const line = (node.content || []).map(textWithMarks).join('');
        out.push(line || '');
        break;
      }
      case 'heading': {
        const level = Math.min(3, node.attrs?.level || 1);
        const line = (node.content || []).map(textWithMarks).join('');
        out.push(`${'#'.repeat(level)} ${line}`);
        break;
      }
      case 'bullet_list': {
        (node.content || []).forEach((li: any) => {
          const buf: string[] = [];
          (li.content || []).forEach((c: any) => {
            if (c.type === 'paragraph') {
              buf.push((c.content || []).map(textWithMarks).join(''));
            }
          });
          out.push(`- ${buf.join('')}`);
        });
        break;
      }
      case 'ordered_list': {
        let i = 1;
        (node.content || []).forEach((li: any) => {
          const buf: string[] = [];
          (li.content || []).forEach((c: any) => {
            if (c.type === 'paragraph') buf.push((c.content || []).map(textWithMarks).join(''));
          });
          out.push(`${i++}. ${buf.join('')}`);
        });
        break;
      }
      case 'code_block': {
        const lang = node.attrs?.language || '';
        const code = (node.content || []).map((t: any) => t.text || '').join('');
        out.push('```' + lang + `\n${code}\n` + '```');
        break;
      }
      case 'blockquote': {
        const lines: string[] = [];
        (node.content || []).forEach((c: any) => {
          if (c.type === 'paragraph') {
            lines.push((c.content || []).map(textWithMarks).join(''));
          }
        });
        out.push(lines.map((l) => `> ${l}`).join('\n'));
        break;
      }
      case 'horizontal_rule':
        out.push('---');
        break;
      case 'hard_break':
        out.push('');
        break;
      case 'image': {
        const alt = node.attrs?.alt || '';
        const src = node.attrs?.src || '';
        out.push(`![${alt}](${src})`);
        break;
      }
      case 'youtube': {
        const src = node.attrs?.src || node.attrs?.videoId ? `https://www.youtube.com/watch?v=${node.attrs.videoId}` : '';
        out.push(`@[youtube](${src})`);
        break;
      }
      case 'video': {
        const src = node.attrs?.src || '';
        out.push(`<video controls src="${src}"></video>`);
        break;
      }
      case 'text':
        out.push(textWithMarks(node));
        break;
      default:
        // ignore unknown
        break;
    }
  }
  walk(json);
  // Join with double newlines between blocks
  return out.join('\n\n');
}

export default function TipTapEditor({ initialMarkdown, formId, fieldId, sectionId }: Props) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [mdValue, setMdValue] = useState<string>(initialMarkdown || '');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const supabase = createClient();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight: createLowlight(common) }),
      Link.configure({ openOnClick: false, linkOnPaste: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image.configure({}),
      Youtube.configure({ controls: true, nocookie: false }),
      Video,
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      try {
        const json = editor.getJSON();
        const md = toMarkdown(json);
        const input = document.getElementById(fieldId) as HTMLInputElement | null;
        if (input) input.value = md;
        setMdValue(md);
        // manual save only; no autosave
      } catch (e) {
        // ignore serialization errors for now
      }
    },
  });

  useEffect(() => {
    (async () => {
      const html = await mdToSafeHtml(initialMarkdown || '');
      editor?.commands.setContent(html, { emitUpdate: true });
      const input = document.getElementById(fieldId) as HTMLInputElement | null;
      if (input) input.value = initialMarkdown || '';
      // initialize preview md value
      try { setMdValue(initialMarkdown || ''); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (tab !== 'preview') return;
      const html = await mdToSafeHtml(mdValue || '');
      if (!cancelled) setPreviewHtml(html);
    })();
    return () => { cancelled = true; };
  }, [tab, mdValue]);

  // No autosave; manual save button submits the form

  const apply = (fn: () => void) => () => editor && fn();

  const promptLink = () => {
    const url = prompt('リンクURL (https://...)');
    if (!url) return;
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run();
  };
  const unsetLink = () => editor?.chain().focus().unsetLink().run();

  const uploadFile = async (file: File, kind: 'image' | 'video') => {
    try {
      if (kind === 'image') {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('画像は png/jpg/jpeg/webp を選択してください');
        if (file.size > 5 * 1024 * 1024) throw new Error('画像は 5MB 以下にしてください');
        const ext = file.type.split('/')[1] || 'png';
        const path = `${sectionId}/images/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('lesson-assets').upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('lesson-assets').getPublicUrl(path);
        editor?.chain().focus().setImage({ src: data.publicUrl, alt: '' }).run();
        dispatchToast('画像を挿入しました', 'success');
      } else {
        if (file.type !== 'video/mp4') throw new Error('動画は mp4 のみ対応');
        if (file.size > 100 * 1024 * 1024) throw new Error('動画は 100MB 以下にしてください');
        const path = `${sectionId}/videos/${crypto.randomUUID()}.mp4`;
        const { error } = await supabase.storage.from('lesson-assets').upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('lesson-assets').getPublicUrl(path);
        editor?.chain().focus().insertContent({ type: 'video', attrs: { src: data.publicUrl } }).run();
        dispatchToast('動画を挿入しました', 'success');
      }
    } catch (e: any) {
      dispatchToast(e.message || 'アップロードに失敗しました', 'error');
    }
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadFile(f, 'image');
    e.currentTarget.value = '';
  };
  const onPickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadFile(f, 'video');
    e.currentTarget.value = '';
  };

  const insertYouTube = () => {
    const url = prompt('YouTube のURLを入力してください');
    if (!url) return;
    editor?.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 rounded-xl bg-white p-2">
        {/* Tabs */}
        <div className="flex rounded-lg bg-brand-sky/10 p-0.5">
          <button type="button" aria-label="編集" aria-pressed={tab === 'edit'} className={["px-3 py-1.5 text-sm rounded-md", tab === 'edit' ? 'bg-brand-yellow text-brand' : 'text-slate-700'].join(' ')} onClick={() => setTab('edit')}>編集</button>
          <button type="button" aria-label="プレビュー" aria-pressed={tab === 'preview'} className={["px-3 py-1.5 text-sm rounded-md", tab === 'preview' ? 'bg-brand-yellow text-brand' : 'text-slate-700'].join(' ')} onClick={() => setTab('preview')}>プレビュー</button>
        </div>
        {tab === 'edit' && (
          <div className="flex flex-wrap items-center gap-2 ml-2">
            <button aria-label="H1" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={apply(() => editor?.chain().focus().toggleHeading({ level: 1 }).run())}>H1</button>
            <button aria-label="H2" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={apply(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())}>H2</button>
            <button aria-label="H3" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={apply(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())}>H3</button>
            <button aria-label="太字" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={apply(() => editor?.chain().focus().toggleBold().run())}>B</button>
            <button aria-label="斜体" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm italic" onClick={apply(() => editor?.chain().focus().toggleItalic().run())}>I</button>
            <span className="mx-1 w-px self-stretch bg-brand-sky/10" />
            <button aria-label="番号付きリスト" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={apply(() => editor?.chain().focus().toggleOrderedList().run())}>1.</button>
            <button aria-label="箇条書き" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={apply(() => editor?.chain().focus().toggleBulletList().run())}>•</button>
            <button aria-label="コードブロック" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={apply(() => editor?.chain().focus().toggleCodeBlock().run())}>Code</button>
            <span className="mx-1 w-px self-stretch bg-brand-sky/10" />
            <button aria-label="リンク" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={promptLink}>Link</button>
            <button aria-label="リンク解除" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={unsetLink}>Unlink</button>
            <label className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm cursor-pointer">画像
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickImage} className="hidden" />
            </label>
            <button aria-label="YouTube挿入" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={insertYouTube}>YouTube</button>
            <label className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm cursor-pointer">動画
              <input type="file" accept="video/mp4" onChange={onPickVideo} className="hidden" />
            </label>
          </div>
        )}
      </div>
      {tab === 'edit' ? (
        <div className="rounded-2xl border border-brand-sky/20 bg-white p-3 min-h-[200px]">
          <EditorContent editor={editor} className="outline-none" />
        </div>
      ) : (
        <div className="rounded-2xl border border-brand-sky/20 bg-white p-3 min-h-[200px]">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}
    </div>
  );
}
