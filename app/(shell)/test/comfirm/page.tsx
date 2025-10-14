import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import StudentTestPreview from '@/components/admin/TestStudentPreview';

export const dynamic = 'force-dynamic';

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
      .select('id,title,course_id')
      .is('deleted_at', null)
      .order('chapter_sort_key', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('tests')
      .select('id,title,mode,spec_yaml,status,course_id,chapter_id')
      .eq('status', 'published')
      .order('created_at', { ascending: true }),
  ]);

  const allTests = (tests || []).filter((t: any) => !!t.mode);
  const courseMap = new Map<string, { id: string; title: string | null }>();
  (courses || []).forEach((c: any) => courseMap.set(c.id, c));
  const chaptersByCourse = new Map<string, Array<any>>();
  (chapters || []).forEach((ch: any) => {
    const arr = chaptersByCourse.get(ch.course_id) || [];
    arr.push(ch);
    chaptersByCourse.set(ch.course_id, arr);
  });

  // Group tests by course -> chapter (null chapter goes under "コース直下")
  const testsByCourse = new Map<string, Map<string | null, Array<any>>>();
  for (const t of allTests) {
    if (!testsByCourse.has(t.course_id)) testsByCourse.set(t.course_id, new Map());
    const byChapter = testsByCourse.get(t.course_id)!;
    const key = t.chapter_id || null;
    if (!byChapter.has(key)) byChapter.set(key, []);
    byChapter.get(key)!.push(t);
  }

  const orderedCourses = (courses || []).filter((c: any) => testsByCourse.has(c.id));

  const ModeBadge = ({ mode }: { mode: string }) => (
    <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[11px] leading-4 text-indigo-700">
      {mode === 'fill_blank'
        ? '穴埋め'
        : mode === 'semantic_fill'
        ? '言語化穴埋め'
        : mode === 'fix'
        ? '修正'
        : mode === 'reorder'
        ? '並べ替え'
        : '未設定'}
    </span>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">確認テスト</h1>

      {orderedCourses.length === 0 ? (
        <div className="text-sm text-slate-500">公開中の確認テストはありません。</div>
      ) : (
        orderedCourses.map((course: any) => {
          const byChapter = testsByCourse.get(course.id)!;
          const courseChapters = chaptersByCourse.get(course.id) || [];
          const orderedChapterGroups: Array<{ id: string | null; title: string }> = [
            { id: null, title: 'コース直下' },
            ...courseChapters.map((ch: any) => ({ id: ch.id as string, title: ch.title || ch.id })),
          ];

          return (
            <section key={course.id} className="space-y-4">
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">{course.title || '無題のコース'}</h2>
              </header>

              {orderedChapterGroups.map((grp) => (
                <div key={grp.id ?? 'root'} className="space-y-3">
                  <div className="text-sm text-slate-600">
                    {grp.id ? (
                      <a href={`/test/comfirm/chapter/${grp.id}`} className="underline decoration-white/20 hover:decoration-white focus-ring rounded">
                        {grp.title}
                      </a>
                    ) : (
                      <a href={`/test/comfirm/course/${course.id}`} className="underline decoration-white/20 hover:decoration-white focus-ring rounded">
                        {grp.title}
                      </a>
                    )}
                  </div>
                  {/* チャプター詳細ページでランナー表示するため、ここではリンクのみ */}
                </div>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
