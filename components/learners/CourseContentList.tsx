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
          <div key={ch.id} className="surface-card overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 border-b border-[color:var(--line)] bg-[color:var(--surface-1)]/90 px-4 py-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--brand)]/18 text-sm font-semibold text-[color:var(--brand)]">
                {ch.chapter_sort_key}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--text)]">{ch.title}</p>
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--surface-1)] text-[color:var(--muted)]">
                  <tr className="border-b border-[color:var(--line)]">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">順番</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">タイトル</th>
                    <th className="pl-3 pr-1 py-2 text-right text-xs font-semibold uppercase tracking-wide">ステータス</th>
                    <th className="pl-1 pr-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">所要時間</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedSections[ch.id].map((s) => {
                    const statusLabel = s.is_completed ? '学習済み' : '学習可';
                    const statusClass = s.is_completed
                      ? 'border-[color:var(--success)]/50 bg-[color:var(--success)]/15 text-[color:var(--success)]'
                      : 'border-[color:var(--brand)]/50 bg-[color:var(--brand)]/12 text-[color:var(--brand)]';
                    return (
                      <tr
                        key={s.id}
                        className="group cursor-pointer border-t border-[color:var(--line)] transition hover:bg-[color:var(--brand)]/10 focus:bg-[color:var(--brand)]/12 focus:outline-none"
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
                        <td className="px-4 py-2 text-[color:var(--muted)]">{s.section_sort_key}</td>
                        <td className="px-4 py-2 text-[color:var(--text)]">
                          <span className="inline-flex max-w-full items-center gap-2 text-[color:var(--text)] underline decoration-transparent transition group-hover:decoration-[color:var(--brand)]">
                            {s.title}
                          </span>
                        </td>
                        <td className="pl-3 pr-1 py-2 text-right">
                          <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium transition ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="pl-1 pr-3 py-2 text-right text-[color:var(--muted)]">{s.duration_min || 0} 分</td>
                      </tr>
                    );
                  })}
                  {!orderedSections[ch.id].length && (
                    <tr>
                      <td className="px-4 py-3 text-[color:var(--muted)]" colSpan={4}>
                        公開セクションはありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 border-t border-[color:var(--line)] px-4 py-4 sm:hidden">
              {orderedSections[ch.id].map((s) => {
                const statusLabel = s.is_completed ? '学習済み' : '学習可';
                const statusClass = s.is_completed
                  ? 'border-[color:var(--success)]/50 bg-[color:var(--success)]/15 text-[color:var(--success)]'
                  : 'border-[color:var(--brand)]/50 bg-[color:var(--brand)]/12 text-[color:var(--brand)]';
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => router.push(`/courses/${courseId}/sections/${s.id}`)}
                    className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)]/80 p-4 text-left text-sm transition hover:border-[color:var(--brand)] hover:bg-[color:var(--surface-1)] focus-ring"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
                        <span className="rounded-full bg-[color:var(--brand)]/12 px-2 py-0.5 font-semibold text-[color:var(--brand)]">
                          #{s.section_sort_key}
                        </span>
                        {s.duration_min || 0} 分
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium transition ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--text)]">{s.title}</p>
                  </button>
                );
              })}
              {!orderedSections[ch.id].length && (
                <div className="rounded-xl border border-dashed border-[color:var(--line)] p-3 text-center text-xs text-[color:var(--muted)]">
                  公開セクションはありません
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
