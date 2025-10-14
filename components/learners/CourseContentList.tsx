"use client";
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

type Chapter = {
  id: string;
  title: string;
  chapter_sort_key: number;
};

type Section = {
  id: string;
  title: string;
  section_sort_key: number;
  duration_min: number | null;
  is_unlocked?: boolean;
  is_completed?: boolean;
};

export default function CourseContentList({
  chapters,
  sectionsByChapter,
  courseId,
}: {
  chapters: Chapter[];
  sectionsByChapter: Record<string, Section[]>;
  courseId: string;
}) {
  const router = useRouter();

  const orderedSections = useMemo(() => {
    const out: Record<string, Section[]> = {};
    for (const ch of chapters) {
      const arr = (sectionsByChapter[ch.id] || []).slice();
      arr.sort((a, b) => (a.section_sort_key ?? 0) - (b.section_sort_key ?? 0));
      out[ch.id] = arr;
    }
    return out;
  }, [chapters, sectionsByChapter]);

  return (
    <div className="px-2 pb-3">
      <div className="space-y-2">
        {chapters.map((ch) => (
          <div key={ch.id} className="rounded-2xl border border-brand-sky/20 bg-white shadow-sm">
            <div className="flex items-center gap-3 rounded-t-2xl border-b border-brand-sky/15 bg-brand-sky/5 px-4 py-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-sky/20 text-sm font-semibold text-brand">
                {ch.chapter_sort_key}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{ch.title}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white text-slate-500">
                  <tr className="border-b border-brand-sky/15">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">順番</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">タイトル</th>
                    <th className="pl-3 pr-1 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">ステータス</th>
                    <th className="pl-1 pr-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">所要時間</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedSections[ch.id].map((s) => {
                    const statusLabel = s.is_completed ? '学習済み' : '学習可';
                    const statusClass = s.is_completed
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                      : 'border-sky-500/30 bg-sky-500/10 text-sky-700';
                    return (
                      <tr
                        key={s.id}
                        className="group border-t border-brand-sky/10 cursor-pointer transition hover:bg-brand-sky/10 focus:bg-brand-sky/10 focus:outline-none"
                        onClick={() => router.push(`/courses/${courseId}/sections/${s.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            router.push(`/courses/${courseId}/sections/${s.id}`);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <td className="px-4 py-2 text-slate-600">{s.section_sort_key}</td>
                        <td className="px-4 py-2 text-slate-800">
                          <span className="inline-flex max-w-full items-center gap-2 text-slate-800 underline decoration-transparent transition group-hover:decoration-brand">
                            {s.title}
                          </span>
                        </td>
                        <td className="pl-3 pr-1 py-2 text-right">
                          <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium transition ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="pl-1 pr-3 py-2 text-right text-slate-600">{s.duration_min || 0} 分</td>
                      </tr>
                    );
                  })}
                  {!orderedSections[ch.id].length && (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={4}>
                        公開セクションはありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
