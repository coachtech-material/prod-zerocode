"use client";
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mdToSafeHtml } from '@/lib/markdown';

type Props = {
  initialMarkdown: string;
  formId: string;
  fieldId: string;
  sectionId: string;
};

function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
}

export default function MarkdownEditor({ initialMarkdown, formId, fieldId, sectionId }: Props) {
  const supabase = createClient();
  const [val, setVal] = useState(initialMarkdown || '');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [previewHtml, setPreviewHtml] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const autoSize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  };

  // initialize hidden field
  useEffect(() => {
    const input = document.getElementById(fieldId) as HTMLInputElement | null;
    if (input) input.value = val;
    // ensure initial autosize when mounted
    requestAnimationFrame(autoSize);
  }, [fieldId]);

  // preview
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (tab !== 'preview') return;
      const html = await mdToSafeHtml(val || '');
      if (!cancelled) setPreviewHtml(html);
    })();
    return () => { cancelled = true; };
  }, [tab, val]);

  // when returning to edit tab, re-apply autosize based on current content
  useEffect(() => {
    if (tab === 'edit') {
      requestAnimationFrame(autoSize);
    }
  }, [tab]);

  const writeBack = (next: string) => {
    setVal(next);
    const input = document.getElementById(fieldId) as HTMLInputElement | null;
    if (input) input.value = next;
    // resize if textarea is present (edit tab)
    requestAnimationFrame(autoSize);
  };

  const surround = (pre: string, post = pre) => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    const { selectionStart: s, selectionEnd: e } = ta;
    const before = val.slice(0, s);
    const mid = val.slice(s, e);
    const after = val.slice(e);
    const next = `${before}${pre}${mid || ''}${post}${after}`;
    writeBack(next);
    // restore selection
    const pos = (before + pre + (mid || '') + post).length;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = pos;
    });
  };

  const prefixLines = (prefix: string) => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const startLine = val.lastIndexOf('\n', s - 1) + 1;
    const endLine = e === 0 ? 0 : val.indexOf('\n', e);
    const endIdx = endLine === -1 ? val.length : endLine;
    const block = val.slice(startLine, endIdx);
    const transformed = block
      .split('\n')
      .map((line, i) => (line.trim().length ? `${prefix}${line.replace(/^([#\-\d\.\s]+)/, (m) => m)}` : line))
      .join('\n');
    const next = val.slice(0, startLine) + transformed + val.slice(endIdx);
    writeBack(next);
  };

  const codeBlock = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const mid = val.slice(s, e);
    const block = '```\n' + (mid || '') + '\n```';
    surround(block, '');
  };

  const setHeading = (level: 1 | 2 | 3) => prefixLines('#'.repeat(level) + ' ');

  const orderedList = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const startLine = val.lastIndexOf('\n', s - 1) + 1;
    const endLine = e === 0 ? 0 : val.indexOf('\n', e);
    const endIdx = endLine === -1 ? val.length : endLine;
    const lines = val.slice(startLine, endIdx).split('\n');
    const transformed = lines.map((line, i) => (line.trim().length ? `${i + 1}. ${line}` : line)).join('\n');
    const next = val.slice(0, startLine) + transformed + val.slice(endIdx);
    writeBack(next);
  };

  const bulletList = () => prefixLines('- ');

  const promptLink = () => {
    const url = prompt('リンクURL (https://...)');
    if (!url) return;
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const label = val.slice(s, e) || 'link';
    const md = `[${label}](${url})`;
    const before = val.slice(0, s);
    const after = val.slice(e);
    writeBack(before + md + after);
  };

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
        surround(`![alt](${data.publicUrl})`, '');
        toast('画像を挿入しました', 'success');
      } else {
        if (file.type !== 'video/mp4') throw new Error('動画は mp4 のみ対応');
        if (file.size > 100 * 1024 * 1024) throw new Error('動画は 100MB 以下にしてください');
        const path = `${sectionId}/videos/${crypto.randomUUID()}.mp4`;
        const { error } = await supabase.storage.from('lesson-assets').upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('lesson-assets').getPublicUrl(path);
        surround(`<video controls src="${data.publicUrl}"></video>`, '');
        toast('動画を挿入しました', 'success');
      }
    } catch (e: any) {
      toast(e.message || 'アップロードに失敗しました', 'error');
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
    surround(`@[youtube](${url})`, '');
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
            <button aria-label="H1" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => setHeading(1)}>H1</button>
            <button aria-label="H2" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => setHeading(2)}>H2</button>
            <button aria-label="H3" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => setHeading(3)}>H3</button>
            <button aria-label="太字" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => surround('**', '**')}>B</button>
            <button aria-label="斜体" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm italic" onClick={() => surround('*', '*')}>I</button>
            <span className="mx-1 w-px self-stretch bg-brand-sky/10" />
            <button aria-label="番号付きリスト" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={orderedList}>1.</button>
            <button aria-label="箇条書き" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={bulletList}>•</button>
            <button aria-label="コードブロック" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={codeBlock}>Code</button>
            <span className="mx-1 w-px self-stretch bg-brand-sky/10" />
            <button aria-label="リンク" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={promptLink}>Link</button>
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
          <textarea
            ref={taRef}
            value={val}
            onChange={(e) => { setVal(e.target.value); writeBack(e.target.value); }}
            className="w-full min-h-[200px] bg-transparent outline-none focus:outline-none font-mono text-sm"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-brand-sky/20 bg-white p-3 min-h-[200px]">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}
    </div>
  );
}
