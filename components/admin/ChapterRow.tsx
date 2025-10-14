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
    <details className="rounded-xl border border-brand-sky/20 bg-white">
      <summary className="cursor-pointer select-none px-3 py-2 text-slate-700">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate" title={title}>{title}</span>
            {chapterStatus && (
              <span
                className={[
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4',
                  chapterStatus === 'published'
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700'
                    : 'border-slate-500/30 bg-slate-500/15 text-slate-700',
                ].join(' ')}
              >
                {chapterStatus === 'published' ? '公開' : '非公開'}
              </span>
            )}
            <span className="ml-1 text-xs text-slate-500 whitespace-nowrap">{count}件</span>
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
                <li key={t.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                  <a
                    href={`/admin/test/comfirm/${t.id}`}
                    className="truncate text-slate-800 hover:underline"
                    title={t.title || '(無題)'}
                  >
                    {t.title || '(無題)'}
                  </a>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4',
                        'border-indigo-500/30 bg-indigo-500/15 text-indigo-700',
                      ].join(' ')}
                      title={`テスト形態: ${modeLabel}`}
                    >
                      {modeLabel}
                    </span>
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4',
                        t.status === 'published'
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700'
                          : 'border-slate-500/30 bg-slate-500/15 text-slate-700',
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
          <div className="text-sm text-slate-500">テストがありません</div>
        )}
      </div>
    </details>
  );
}
