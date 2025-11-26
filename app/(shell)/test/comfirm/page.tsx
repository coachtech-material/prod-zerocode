import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ChevronDown } from 'lucide-react';

type ChapterAttemptStatus = 'not_attempted' | 'failed' | 'passed';

export const dynamic = 'force-dynamic';

const modeLabel = (mode?: string | null) =>
  mode === 'fill_blank'
    ? '穴埋め'
    : mode === 'semantic_fill'
    ? '言語化穴埋め'
    : mode === 'fix'
    ? '修正'
    : mode === 'reorder'
    ? '並べ替え'
    : '未設定';

export default async function ConfirmTestsPage() {
  await requireRole(['user']);
  const supabase = createServerSupabaseClient();
  const [{ data: courses }, { data: chapters }, { data: tests }] = await Promise.all([
    supabase
      .from('courses')
      .select('id,title')
      .is('deleted_at', null)
      .order('sort_key', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('chapters')
      .select('id,title,course_id,chapter_sort_key')
      .is('deleted_at', null)
      .order('chapter_sort_key', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('tests')
      .select('id,title,mode,status,course_id,chapter_id,created_at')
      .eq('status', 'published')
      .order('chapter_id', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let userTestResults: Array<{ test_id: string; is_passed: boolean | null }> = [];
  if (user?.id) {
    const { data: rows, error } = await supabase
      .from('test_results')
      .select('test_id,is_passed')
      .eq('user_id', user.id);
    if (error) {
      if ((error as any)?.code !== '42P01') {
        console.error('test_results fetch error', error);
      }
    } else {
      userTestResults = rows ?? [];
    }
  }

  const allTests = (tests || []).filter((test: any) => !!test.mode && !!test.chapter_id);
  const testsByChapter = new Map<string, Array<any>>();
  for (const test of allTests) {
    const chapterId = test.chapter_id as string;
    if (!testsByChapter.has(chapterId)) testsByChapter.set(chapterId, []);
    testsByChapter.get(chapterId)!.push(test);
  }

  const chaptersByCourse = new Map<string, Array<any>>();
  (chapters || []).forEach((chapter: any) => {
    const arr = chaptersByCourse.get(chapter.course_id) || [];
    arr.push(chapter);
    chaptersByCourse.set(chapter.course_id, arr);
  });

  const orderedCourses = (courses || []).filter((course: any) => {
    const relatedChapters = chaptersByCourse.get(course.id) || [];
    return relatedChapters.some((chapter) => testsByChapter.has(chapter.id));
  });
  const testStatusMap = new Map<string, ChapterAttemptStatus>();
  userTestResults.forEach((row) => {
    if (!row?.test_id) return;
    if (row.is_passed) {
      testStatusMap.set(row.test_id, 'passed');
    } else if (row.is_passed === false) {
      testStatusMap.set(row.test_id, 'failed');
    }
  });
  const getChapterStatus = (chapterId: string): ChapterAttemptStatus => {
    const chapterTests = testsByChapter.get(chapterId) || [];
    if (!chapterTests.length) return 'not_attempted';
    let hasAnyResult = false;
    let allPassed = true;
    for (const test of chapterTests) {
      const status = testStatusMap.get(test.id);
      if (!status) {
        allPassed = false;
        continue;
      }
      hasAnyResult = true;
      if (status !== 'passed') {
        allPassed = false;
        break;
      }
    }
    if (hasAnyResult && allPassed && chapterTests.every((test) => testStatusMap.get(test.id) === 'passed')) {
      return 'passed';
    }
    return hasAnyResult ? 'failed' : 'not_attempted';
  };

  return (
    <div className="space-y-8 text-slate-100">
      <h1 className="text-xl font-semibold text-white">確認テスト</h1>

      {orderedCourses.length === 0 ? (
        <div className="text-sm text-[color:var(--muted,#9CA3AF)]">公開中の確認テストはありません。</div>
      ) : (
        orderedCourses.map((course: any) => {
          const relatedChapters = (chaptersByCourse.get(course.id) || []).filter((chapter: any) =>
            testsByChapter.has(chapter.id)
          );

          return (
            <section key={course.id} className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface-1,#111827)] p-4 shadow">
              <header className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="text-lg font-semibold text-white">{course.title || '無題のコース'}</h2>
                <p className="text-xs text-[color:var(--muted,#9CA3AF)]">チャプター {relatedChapters.length} 件</p>
              </header>

              <div className="space-y-3">
                {relatedChapters.map((chapter: any) => {
                  const chapterTests = testsByChapter.get(chapter.id) || [];
                  const passedCount = chapterTests.filter((test) => testStatusMap.get(test.id) === 'passed').length;
                  const accuracy = chapterTests.length ? Math.round((passedCount / chapterTests.length) * 100) : 0;
                  return (
                    <details
                      key={chapter.id}
                      className="group/chapter rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm open:border-indigo-300/60 open:bg-indigo-500/10"
                    >
                      <summary className="flex cursor-pointer select-none items-center justify-between gap-4 text-sm text-white">
                        <div className="flex flex-1 items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition group-open/chapter:rotate-180">
                            <ChevronDown size={16} />
                          </div>
                          <div>
                            <span className="font-medium">{chapter.title || chapter.id}</span>
                            <div className="text-xs text-[color:var(--muted,#9CA3AF)]">クリックで開閉</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[color:var(--muted,#9CA3AF)]">
                          <span>テスト {chapterTests.length} 件</span>
                          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] text-yellow-200">正答率 {accuracy}%</span>
                        </div>
                      </summary>
                      <div className="mt-3 space-y-2">
                        {chapterTests.map((test: any, index: number) => (
                          <div
                            key={test.id}
                            className="flex flex-wrap items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                          >
                            <div className="min-w-0 flex-1">
                              <a
                                href={`/test/comfirm/chapter/${chapter.id}?i=${index}`}
                                className="truncate font-medium text-white underline decoration-transparent hover:decoration-indigo-300"
                              >
                                {test.title || '(無題)'}
                              </a>
                              <div className="text-xs text-[color:var(--muted,#D1D5DB)]">{modeLabel(test.mode)}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={[
                                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                  (() => {
                                    const state = testStatusMap.get(test.id);
                                    if (state === 'passed') {
                                      return 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40';
                                    }
                                    if (state === 'failed') {
                                      return 'bg-rose-500/15 text-rose-100 border border-rose-500/40';
                                    }
                                    return 'border border-white/15 text-[color:var(--muted,#D1D5DB)]';
                                  })(),
                                ].join(' ')}
                              >
                                {testStatusMap.get(test.id) === 'passed'
                                  ? '合格'
                                  : testStatusMap.get(test.id) === 'failed'
                                    ? '不合格'
                                    : '未受験'}
                              </span>
                              <a
                                href={`/test/comfirm/chapter/${chapter.id}?i=${index}`}
                                className="text-xs font-semibold text-indigo-300 hover:underline"
                              >
                                受験する
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
