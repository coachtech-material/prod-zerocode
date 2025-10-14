"use client";
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';

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
  const [items, setItems] = useState<Row[]>(() => rows.slice().sort((a,b)=>a.section_sort_key-b.section_sort_key));
  const dragIndex = useRef<number | null>(null);

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
    setItems(arr);
    // auto-submit order
    const input = document.getElementById(orderedFieldId) as HTMLInputElement | null;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (input) input.value = arr.map((r)=>r.id).join(',');
    if (form) form.requestSubmit();
    dragIndex.current = null;
  };

  const orderedIds = useMemo(() => items.map((r)=>r.id).join(','), [items]);

  return (
    <div className="rounded-2xl border border-brand-sky/20 bg-white p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-medium">所属セクション一覧</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-white text-slate-600">
          <tr>
            <th className="text-left px-3 py-2 w-24">キー</th>
            <th className="text-left px-3 py-2">コースコンテンツ名</th>
            <th className="text-left px-3 py-2 w-24">種別</th>
            <th className="text-left px-3 py-2 w-24">公開</th>
            <th className="text-left px-3 py-2 w-28">所要時間</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r, idx) => (
            <tr key={r.id}
                draggable
                onDragStart={onDragStart(idx)}
                onDragOver={onDragOver}
                onDrop={onDrop(idx)}
                className="border-t border-brand-sky/20 hover:bg-white cursor-move">
              <td className="px-3 py-3 align-middle">{idx + 1}</td>
              <td className="px-3 py-3 align-middle">
                <Link href={`/admin/courses/${courseId}/sections/${r.id}`} className="underline decoration-white/20 hover:decoration-white">{r.title}</Link>
              </td>
              <td className="px-3 py-3 align-middle"><span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs">セクション</span></td>
              <td className="px-3 py-3 align-middle"><span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs">{r.status === 'published' ? '公開' : '非公開'}</span></td>
              <td className="px-3 py-3 align-middle">{r.duration_min || 0} 分</td>
            </tr>
          ))}
          {!items.length && (
            <tr><td className="px-3 py-6 text-slate-500" colSpan={5}>このチャプターにセクションはありません。</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
