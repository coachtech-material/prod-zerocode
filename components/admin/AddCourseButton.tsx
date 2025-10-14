"use client";
import { useState } from 'react';
import { createCourse } from '@/app/(shell)/admin/courses/actions';

export default function AddCourseButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-brand-yellow px-3 py-2 text-brand hover:opacity-90 focus-ring text-sm"
      >
        コースを追加
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[color:rgba(3,25,45,0.65)] p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-brand-sky/20 bg-[color:var(--color-surface)] p-4 shadow-[0_20px_50px_rgba(2,129,202,0.25)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">コースを追加</h3>
              <button className="text-slate-600 hover:text-white" onClick={() => setOpen(false)}>×</button>
            </div>
            <form action={createCourse} className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">コース名</span>
                <input name="title" required maxLength={120} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" placeholder="例: 英文法入門" />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" onClick={() => setOpen(false)}>キャンセル</button>
                <button type="submit" className="rounded-xl bg-brand-yellow px-3 py-2 text-brand focus-ring">作成</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
