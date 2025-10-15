"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Row = { id: string; title: string; status: 'draft'|'published'; section_sort_key: number; duration_min: number };

export default function SectionsReorderTable({
  courseId,
  chapterId,
  rows,
  formId,
  orderedFieldId,
}: {
  courseId: string;
  chapterId: string;
  rows: Row[];
  formId: string;
  orderedFieldId: string;
}) {
  const [items, setItems] = useState<Row[]>(() =>
    rows.slice().sort((a, b) => a.section_sort_key - b.section_sort_key),
  );
  const dragIndex = useRef<number | null>(null);

  const commitOrder = (next: Row[], submit = false) => {
    setItems(next);
    const apply = () => {
      const input = document.getElementById(orderedFieldId) as HTMLInputElement | null;
      if (input) input.value = next.map((r) => r.id).join(',');
      if (submit) {
        const form = document.getElementById(formId) as HTMLFormElement | null;
        form?.requestSubmit();
      }
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(apply);
    } else {
      apply();
    }
  };

  useEffect(() => {
    const input = document.getElementById(orderedFieldId) as HTMLInputElement | null;
    if (input) input.value = items.map((r) => r.id).join(',');
  }, [items, orderedFieldId]);

  const onDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from == null || from === index) return;
    const arr = items.slice();
    const [moved] = arr.splice(from, 1);
    arr.splice(index, 0, moved);
    commitOrder(arr, true);
    dragIndex.current = null;
  };

  const moveItem = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const arr = items.slice();
    const [moved] = arr.splice(index, 1);
    arr.splice(target, 0, moved);
    commitOrder(arr, true);
  };

  return (
    <div className="rounded-2xl border border-brand-sky/20 bg-white p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-medium">所属セクション一覧</h3>
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-[640px] w-full text-sm">
          <thead className="bg-white text-slate-600">
            <tr>
              <th className="w-24 px-3 py-2 text-left">キー</th>
              <th className="px-3 py-2 text-left">コースコンテンツ名</th>
              <th className="w-24 px-3 py-2 text-left">種別</th>
              <th className="w-24 px-3 py-2 text-left">公開</th>
              <th className="w-28 px-3 py-2 text-left">所要時間</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, idx) => (
              <tr
                key={r.id}
                draggable
                onDragStart={onDragStart(idx)}
                onDragOver={onDragOver}
                onDrop={onDrop(idx)}
                className="cursor-move border-t border-brand-sky/20 hover:bg-white"
              >
                <td className="px-3 py-3 align-middle">{idx + 1}</td>
                <td className="px-3 py-3 align-middle">
                  <Link
                    href={`/admin/courses/${courseId}/sections/${r.id}`}
                    className="underline decoration-white/20 hover:decoration-white"
                  >
                    {r.title}
                  </Link>
                </td>
                <td className="px-3 py-3 align-middle">
                  <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs">セクション</span>
                </td>
                <td className="px-3 py-3 align-middle">
                  <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs">
                    {r.status === 'published' ? '公開' : '非公開'}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle">{r.duration_min || 0} 分</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={5}>
                  このチャプターにセクションはありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 border-t border-brand-sky/10 px-4 py-4 sm:hidden">
        {items.map((r, idx) => (
          <div
            key={`mobile-${r.id}`}
            className="rounded-2xl border border-brand-sky/30 bg-white/70 p-4 text-sm shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">#{idx + 1}</p>
                <Link
                  href={`/admin/courses/${courseId}/sections/${r.id}`}
                  className="mt-1 inline-flex items-center text-base font-semibold text-slate-800 underline decoration-transparent hover:decoration-brand focus-ring"
                >
                  {r.title}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-brand">セクション</span>
                  <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-brand">
                    {r.status === 'published' ? '公開' : '非公開'}
                  </span>
                  <span>{r.duration_min || 0} 分</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-sky/30 text-brand transition hover:border-brand-sky/50 hover:bg-brand-sky/10 focus-ring disabled:opacity-40"
                  aria-label="上に移動"
                  disabled={idx === 0}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-sky/30 text-brand transition hover:border-brand-sky/50 hover:bg-brand-sky/10 focus-ring disabled:opacity-40"
                  aria-label="下に移動"
                  disabled={idx === items.length - 1}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="rounded-2xl border border-dashed border-brand-sky/30 p-4 text-center text-sm text-slate-500">
            このチャプターにセクションはありません。
          </div>
        )}
      </div>
    </div>
  );
}
