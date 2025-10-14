"use client";
import { useEffect, useRef, useState } from 'react';

export default function AvatarPicker({ name, defaultUrl }: { name: string; defaultUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(defaultUrl || null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setPreview(defaultUrl || null); }, [defaultUrl]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 overflow-hidden rounded-full border border-brand-sky/20 bg-brand-sky/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='} alt="avatar" className="h-full w-full object-cover" />
      </div>
      <div className="grid gap-2 text-sm">
        <input ref={fileRef} name={name} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} />
        <div className="text-xs text-slate-500">プロフィール画像は公開URLで配信されます（2MB以下、png/jpg/jpeg/webp）</div>
      </div>
    </div>
  );
}
