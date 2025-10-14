"use client";
import { useEffect, useMemo, useState } from 'react';
import { createChapter, createSection } from '@/app/(shell)/admin/courses/actions';

type Chapter = { id: string; title: string };

export default function AddContentModal({ courseId, chapters }: { courseId: string; chapters: Chapter[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'chapter' | 'section'>('chapter');
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('add-content:open', handler);
    return () => window.removeEventListener('add-content:open', handler);
  }, []);

  const chapterOptions = useMemo(() => chapters, [chapters]);

  const actionChapter = createChapter.bind(null, courseId);
  const actionSection = createSection.bind(null, courseId);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[color:rgba(3,25,45,0.65)] p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-brand-sky/20 bg-[color:var(--color-surface)] p-4 shadow-[0_20px_50px_rgba(2,129,202,0.25)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">コンテンツを追加</h3>
              <button className="text-slate-600 hover:text-white" onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="mb-4 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="kind" value="chapter" checked={kind === 'chapter'} onChange={() => setKind('chapter')} />
                チャプターを追加
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="kind" value="section" checked={kind === 'section'} onChange={() => setKind('section')} />
                セクションを追加
              </label>
            </div>

            {kind === 'chapter' ? (
              <form action={actionChapter} className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-sm text-slate-600">チャプター名</span>
                  <input name="title" required maxLength={120} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" onClick={() => setOpen(false)}>キャンセル</button>
                  <button type="submit" className="rounded-xl bg-brand-yellow px-3 py-2 text-brand focus-ring">追加</button>
                </div>
              </form>
            ) : (
              <form action={actionSection} className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-sm text-slate-600">所属チャプター</span>
                  <select name="chapter_id" required className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring">
                    <option value="">選択してください</option>
                    {chapterOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-slate-600">セクション名</span>
                  <input name="title" required maxLength={120} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" onClick={() => setOpen(false)}>キャンセル</button>
                  <button type="submit" className="rounded-xl bg-brand-yellow px-3 py-2 text-brand focus-ring">追加</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
