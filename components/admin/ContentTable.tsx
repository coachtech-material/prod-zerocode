"use client";
import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Shapes, FileText } from 'lucide-react';
import Link from 'next/link';

type Chapter = {
  id: string;
  title: string;
  status: 'draft' | 'published';
  chapter_sort_key: number;
};

type Section = {
  id: string;
  title: string;
  status: 'draft' | 'published';
  section_sort_key: number;
  duration_min: number | null;
  chapter_id: string;
};

export default function ContentTable({
  chapters,
  sections,
  courseId,
}: {
  chapters: Chapter[];
  sections: Section[];
  courseId: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const ch of chapters) initial[ch.id] = true;
    return initial;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Section[]>();
    for (const s of sections) {
      if (!map.has(s.chapter_id)) map.set(s.chapter_id, []);
      map.get(s.chapter_id)!.push(s);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => (a.section_sort_key ?? 0) - (b.section_sort_key ?? 0));
    }
    return map;
  }, [sections]);

  const chapterDuration = (chapterId: string) => {
    const arr = grouped.get(chapterId) || [];
    return arr
      .filter((s) => s.status === 'published')
      .reduce((acc, s) => acc + (s.duration_min || 0), 0);
  };

  return (
    <div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-white text-slate-600">
            <tr>
              <th className="w-28 px-3 py-2 text-left">キー</th>
              <th className="px-3 py-2 text-left">コースコンテンツ名</th>
              <th className="w-24 px-3 py-2 text-left">種別</th>
              <th className="w-24 px-3 py-2 text-left">公開</th>
              <th className="w-32 px-3 py-2 text-left">所要時間</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((ch) => (
              <Fragment key={ch.id}>
                <tr className="border-t border-brand-sky/20 bg-white">
                  <td className="px-3 py-3 align-middle">
                    <button
                      aria-label={open[ch.id] ? 'セクションを閉じる' : 'セクションを開く'}
                      className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-sky/10 hover:bg-brand-sky/20 focus-ring"
                      onClick={() => setOpen((st) => ({ ...st, [ch.id]: !st[ch.id] }))}
                      title="展開/収納"
                    >
                      {open[ch.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <span className="font-medium">{ch.chapter_sort_key}</span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Link
                      href={`/admin/courses/${courseId}/chapters/${ch.id}`}
                      className="underline decoration-white/20 hover:decoration-white"
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Shapes size={16} className="opacity-80" />
                        {ch.title}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs">チャプター</span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs">
                      {ch.status === 'published' ? '公開' : '非公開'}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">{chapterDuration(ch.id)} 分</td>
                </tr>
                {open[ch.id] &&
                  (grouped.get(ch.id) || []).map((s) => (
                    <tr key={s.id} className="border-t border-brand-sky/20">
                      <td className="px-3 py-3 pl-9 align-middle">{s.section_sort_key}</td>
                      <td className="px-3 py-3 align-middle">
                        <Link
                          href={`/admin/courses/${courseId}/sections/${s.id}`}
                          className="underline decoration-white/20 hover:decoration-white"
                        >
                          <div className="flex items-center gap-2 text-slate-600">
                            <FileText size={16} className="opacity-80" />
                            {s.title}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs">セクション</span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs">
                          {s.status === 'published' ? '公開' : '非公開'}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">{s.duration_min || 0} 分</td>
                    </tr>
                  ))}
              </Fragment>
            ))}
            {!chapters.length && (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={5}>
                  このコースにコンテンツはありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-4 sm:hidden">
        {chapters.map((ch) => {
          const sectionsForChapter = grouped.get(ch.id) || [];
          return (
            <div
              key={`mobile-${ch.id}`}
              className="rounded-2xl border border-brand-sky/30 bg-white/60 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">チャプター {ch.chapter_sort_key}</p>
                  <Link
                    href={`/admin/courses/${courseId}/chapters/${ch.id}`}
                    className="mt-1 inline-flex items-center gap-2 text-base font-semibold text-slate-800 underline decoration-transparent hover:decoration-brand focus-ring"
                  >
                    <Shapes size={16} className="opacity-70" />
                    {ch.title}
                  </Link>
                </div>
                <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs text-brand">
                  {ch.status === 'published' ? '公開' : '非公開'}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                公開済み合計: {chapterDuration(ch.id)} 分
              </p>
              <div className="mt-3 space-y-2">
                {sectionsForChapter.length ? (
                  sectionsForChapter.map((s) => (
                    <Link
                      key={s.id}
                      href={`/admin/courses/${courseId}/sections/${s.id}`}
                      className="block rounded-xl border border-brand-sky/20 bg-white/80 p-3 text-sm transition hover:border-brand-sky/40 hover:bg-white focus-ring"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">
                            セクション {s.section_sort_key}
                          </p>
                          <p className="mt-1 font-medium text-slate-800">{s.title}</p>
                        </div>
                        <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs text-brand">
                          {s.status === 'published' ? '公開' : '非公開'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">目安: {s.duration_min || 0} 分</p>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-brand-sky/30 p-3 text-center text-xs text-slate-500">
                    このチャプターにセクションはありません。
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!chapters.length && (
          <div className="rounded-2xl border border-dashed border-brand-sky/30 p-4 text-center text-sm text-slate-500">
            このコースにコンテンツはありません。
          </div>
        )}
      </div>
    </div>
  );
}
