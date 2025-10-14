"use client";

import { useCallback, useMemo, useRef, useState } from 'react';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function AvatarUploader({ initialUrl }: { initialUrl?: string | null }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl || null);
  const [error, setError] = useState<string | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('対応していないファイル形式です');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('ファイルサイズは5MB以下にしてください');
      return;
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    if (inputRef.current) {
      inputRef.current.files = dt.files;
    }
    setPreview(URL.createObjectURL(file));
    setError(null);
  }, []);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  }, [handleFiles]);

  const onPick = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  }, [handleFiles]);

  const dropZoneClass = useMemo(() => [
    'flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-sky/40 bg-white/90 text-sm text-slate-600 transition hover:border-brand hover:text-brand',
  ].join(' '), []);

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" name="avatar" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPick} />
      <div
        className={dropZoneClass}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); } }}
      >
        <p className="text-sm font-medium">ドラッグ＆ドロップ、またはクリックして画像を選択</p>
        <p className="text-xs text-slate-500">対応形式: jpg / png / webp（5MB以下）</p>
      </div>
      {preview && (
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-brand-sky/20 bg-brand-sky/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="avatar preview" className="h-full w-full object-cover" />
          </div>
          <button type="button" className="text-sm font-medium text-brand underline underline-offset-4" onClick={() => { setPreview(null); resetError(); if (inputRef.current) inputRef.current.value = ''; }}>
            画像を削除
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
