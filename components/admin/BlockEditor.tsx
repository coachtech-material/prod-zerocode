"use client";
import { useEffect, useRef, useState } from 'react';

type Props = {
  initialMarkdown: string;
  formId: string;
  fieldId: string;
};

// Minimal block-like editor: each line is a block. Supports headings by typing #, lists by - or 1.
export default function BlockEditor({ initialMarkdown, formId, fieldId }: Props) {
  const [md, setMd] = useState(initialMarkdown);
  const [dirty, setDirty] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-save every 8s if dirty
    timer.current = setInterval(() => {
      if (dirty) {
        submit(md);
        setDirty(false);
      }
    }, 8000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [dirty, md]);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const submit = (value: string) => {
    const input = document.getElementById(fieldId) as HTMLInputElement | null;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (input && form) {
      input.value = value;
      form.requestSubmit();
    }
  };

  const handleSave = () => {
    submit(md);
    setDirty(false);
  };

  return (
    <div className="grid gap-2">
      <textarea
        value={md}
        onChange={(e) => { setMd(e.target.value); setDirty(true); }}
        rows={16}
        className="w-full rounded-2xl bg-white px-3 py-2 focus-ring font-mono text-sm"
        placeholder="# 見出し\n本文...\n- 箇条書き\n```
コード
```"
      />
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-xl bg-brand-yellow px-3 py-2 text-brand focus-ring text-sm" onClick={handleSave}>保存</button>
        {dirty && <span className="text-xs text-slate-500">未保存の変更があります…</span>}
      </div>
    </div>
  );
}
