"use client";
import { useEffect, useRef, useState } from 'react';
import { mdToSafeHtml } from '@/lib/markdown';

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 12,
  autoGrow = true,
  minHeight = 160,
  maxHeight = 800,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  autoGrow?: boolean;
  minHeight?: number;
  maxHeight?: number;
}) {
  const [tab, setTab] = useState<'edit'|'preview'>('edit');
  const [previewHtml, setPreviewHtml] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    if (!autoGrow) return;
    const ta = taRef.current;
    if (!ta) return;
    try {
      // Reset to auto to recalc, then set to content height within bounds
      ta.style.height = 'auto';
      const h = Math.min(maxHeight, Math.max(minHeight, ta.scrollHeight));
      ta.style.height = `${h}px`;
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (tab !== 'preview') return;
      const html = await mdToSafeHtml(value || '');
      if (!cancelled) setPreviewHtml(html);
    })();
    return () => { cancelled = true; };
  }, [tab, value]);

  useEffect(() => {
    if (tab !== 'edit') return;
    requestAnimationFrame(adjustHeight);
  }, [tab, value]);

  const surround = (pre: string, post = pre) => {
    const ta = taRef.current;
    if (!ta || disabled) return;
    ta.focus();
    const s = ta.selectionStart, e = ta.selectionEnd;
    const before = value.slice(0, s);
    const mid = value.slice(s, e);
    const after = value.slice(e);
    const next = `${before}${pre}${mid || ''}${post}${after}`;
    onChange(next);
    const pos = (before + pre + (mid || '') + post).length;
    requestAnimationFrame(() => { if (ta) ta.selectionStart = ta.selectionEnd = pos; });
  };

  const prefixLines = (prefix: string) => {
    const ta = taRef.current;
    if (!ta || disabled) return;
    ta.focus();
    const s = ta.selectionStart, e = ta.selectionEnd;
    const startLine = value.lastIndexOf('\n', s - 1) + 1;
    const endLine = e === 0 ? 0 : value.indexOf('\n', e);
    const endIdx = endLine === -1 ? value.length : endLine;
    const block = value.slice(startLine, endIdx);
    const transformed = block.split('\n').map(line => (line.trim().length ? `${prefix}${line}` : line)).join('\n');
    const next = value.slice(0, startLine) + transformed + value.slice(endIdx);
    onChange(next);
  };

  const orderedList = () => {
    const ta = taRef.current;
    if (!ta || disabled) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const startLine = value.lastIndexOf('\n', s - 1) + 1;
    const endLine = e === 0 ? 0 : value.indexOf('\n', e);
    const endIdx = endLine === -1 ? value.length : endLine;
    const lines = value.slice(startLine, endIdx).split('\n');
    const transformed = lines.map((line, i) => (line.trim().length ? `${i + 1}. ${line}` : line)).join('\n');
    const next = value.slice(0, startLine) + transformed + value.slice(endIdx);
    onChange(next);
  };

  const insertAtCursor = (text: string) => {
    const ta = taRef.current;
    if (!ta || disabled) return;
    ta.focus();
    const s = ta.selectionStart, e = ta.selectionEnd;
    const before = value.slice(0, s);
    const after = value.slice(e);
    const next = `${before}${text}${after}`;
    onChange(next);
    const pos = (before + text).length;
    requestAnimationFrame(() => { if (ta) ta.selectionStart = ta.selectionEnd = pos; });
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg bg-brand-sky/10 p-0.5">
          <button type="button" className={["px-3 py-1.5 text-sm rounded-md", tab === 'edit' ? 'bg-brand-yellow text-brand' : 'text-slate-700'].join(' ')} onClick={() => setTab('edit')}>編集</button>
          <button type="button" className={["px-3 py-1.5 text-sm rounded-md", tab === 'preview' ? 'bg-brand-yellow text-brand' : 'text-slate-700'].join(' ')} onClick={() => setTab('preview')}>プレビュー</button>
        </div>
        {tab === 'edit' && (
          <div className="flex flex-wrap items-center gap-2 ml-2">
            <button aria-label="H1" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => prefixLines('# ')}>H1</button>
            <button aria-label="H2" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => prefixLines('## ')}>H2</button>
            <button aria-label="H3" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => prefixLines('### ')}>H3</button>
            <button aria-label="太字" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => surround('**','**')}>B</button>
            <button aria-label="斜体" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm italic" onClick={() => surround('*','*')}>I</button>
            <button aria-label="コード" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => surround('`','`')}>Code</button>
            <button aria-label="コードブロック" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => surround('```\n','\n```')}>CodeBlock</button>
            <button aria-label="番号付き" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={orderedList}>1.</button>
            <button aria-label="箇条書き" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => prefixLines('- ')}>•</button>
            <button aria-label="リンク" className="rounded-md bg-brand-sky/10 px-2 py-1 text-sm" onClick={() => surround('[','](https://)')}>Link</button>
          </div>
        )}
      </div>
      {tab === 'edit' ? (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e)=>onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder || 'Markdown を入力してください…'}
          className="min-h-[160px] flex-1 rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring text-sm"
          disabled={disabled}
          style={autoGrow ? { height: `${minHeight}px`, resize: 'vertical' } as any : undefined}
        />
      ) : (
        <div className="rounded-xl border border-brand-sky/20 bg-white p-3 min-h-[160px] max-h-[40vh] overflow-y-auto">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}
    </div>
  );
}
