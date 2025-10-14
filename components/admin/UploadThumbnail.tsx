"use client";
import { useState } from 'react';
import { uploadThumbnail, deleteThumbnail } from '@/app/(shell)/admin/courses/actions';

export default function UploadThumbnail({ courseId, url }: { courseId: string; url: string | null }) {
  const [dragOver, setDragOver] = useState(false);
  const actionUpload = uploadThumbnail.bind(null, courseId);
  const actionDelete = deleteThumbnail.bind(null, courseId);
  return (
    <div>
      <div
        className={[
          'rounded-2xl border border-dashed p-4 transition-colors',
          dragOver ? 'bg-brand-sky/10 border-brand-sky/40' : 'bg-white border-brand-sky/30',
        ].join(' ')}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set('file', file);
          actionUpload(fd);
        }}
      >
        <p className="text-sm text-slate-600 mb-2">サムネイル画像をドラッグ＆ドロップ、または選択</p>
        <div className="flex items-center gap-3">
          <form action={actionUpload} encType="multipart/form-data" className="flex items-center gap-3">
            <input name="file" type="file" accept="image/png,image/jpeg" className="text-sm" />
            <button type="submit" className="rounded-xl bg-brand-yellow px-3 py-1.5 text-brand focus-ring text-sm">アップロード</button>
          </form>
          {url && (
            <form action={actionDelete}>
              <button className="rounded-xl bg-brand-sky/10 px-3 py-1.5 focus-ring text-sm" type="submit">削除</button>
            </form>
          )}
        </div>
        {url && (
          <div className="mt-3">
            <img src={url} alt="Thumbnail" className="max-h-40 rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}
