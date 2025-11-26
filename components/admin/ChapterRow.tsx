"use client";
import Link from 'next/link';

export default function ChapterRow({
  title,
  count,
  tests,
  courseId,
  chapterId,
  chapterStatus,
}: {
  title: string;
  count: number;
  tests: Array<{ id: string; title?: string | null; status?: string | null; mode?: string | null }>;
  courseId: string;
  chapterId: string;
  chapterStatus?: string | null;
}) {
  const createTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, chapter_id: chapterId }),
      });
      const j = await res.json();
      if (res.ok && j?.id) {
        window.location.href = `/admin/test/comfirm/${j.id}?tab=basic`;
      } else {
        alert(j?.error || '作成に失敗しました');
      }
    } catch (err) {
      alert('作成に失敗しました');
    }
  };
  return (
    <details className="rounded-xl border border-white/10 bg-[color:var(--surface-1)] shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
      <summary className="cursor-pointer select-none px-3 py-2 text-[color:var(--text)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate" title={title}>{title}</span>
            {chapterStatus && (
              <span
                className={[
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4',
                  chapterStatus === 'published'
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100'
                    : 'border-white/20 bg-white/5 text-[color:var(--muted)]',
                ].join(' ')}
              >
                {chapterStatus === 'published' ? '公開' : '非公開'}
              </span>
            )}
            <span className="ml-1 text-xs text-[color:var(--muted)] whitespace-nowrap">{count}件</span>
          </div>
          <button onClick={createTest} className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs text-brand focus-ring">
            テストを作成
          </button>
        </div>
      </summary>
      <div className="px-3 pb-3">
        {tests.length ? (
          <ul className="space-y-1">
            {tests.map((t) => {
              const modeLabel = t.mode === 'fill_blank'
                ? '穴埋め'
                : t.mode === 'semantic_fill'
                  ? '言語化穴埋め'
                  : t.mode === 'fix'
                    ? '修正'
                    : t.mode === 'reorder'
                      ? '並べ替え'
                      : '未設定';
              return (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <a
                    href={`/admin/test/comfirm/${t.id}`}
                    className="truncate text-[color:var(--text)] hover:underline"
                    title={t.title || '(無題)'}
                  >
                    {t.title || '(無題)'}
                  </a>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4',
                        'border-indigo-500/40 bg-indigo-500/20 text-indigo-100',
                      ].join(' ')}
                      title={`テスト形態: ${modeLabel}`}
                    >
                      {modeLabel}
                    </span>
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4',
                        t.status === 'published'
                          ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100'
                          : 'border-white/20 bg-white/5 text-[color:var(--muted)]',
                      ].join(' ')}
                    >
                      {t.status === 'published' ? '公開' : '非公開'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-[color:var(--muted)]">テストがありません</div>
        )}
      </div>
    </details>
  );
}
