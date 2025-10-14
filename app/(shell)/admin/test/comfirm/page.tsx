import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ChapterRow from '@/components/admin/ChapterRow';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function loadData() {
  const supabase = createServerSupabaseClient();
  const [{ data: courses }, { data: chapters }, { data: tests }] = await Promise.all([
    supabase
      .from('courses')
      .select('id,title,status,deleted_at,sort_key,created_at')
      .is('deleted_at', null)
      .order('sort_key', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('chapters')
      .select('id,title,course_id,status,deleted_at,chapter_sort_key,created_at')
      .is('deleted_at', null)
      .order('chapter_sort_key', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('tests')
      .select('id,title,course_id,chapter_id,status,mode,deleted_at,updated_at,created_at')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  return { courses: courses || [], chapters: chapters || [], tests: tests || [] } as {
    courses: Array<{ id: string; title: string; status: string | null; deleted_at: string | null; sort_key?: number | null; created_at?: string | null }>,
    chapters: Array<{ id: string; title: string; course_id: string; status: string | null; deleted_at: string | null; chapter_sort_key?: number | null; created_at?: string | null }>,
    tests: Array<{ id: string; title: string; course_id: string | null; chapter_id: string | null; status: string | null; mode?: string | null; deleted_at: string | null; updated_at?: string | null; created_at?: string | null }>,
  };
}

export default async function AdminConfirmManagePage() {
  await requireRole(['staff','admin'], { redirectTo: '/ops-login', signOutOnFail: true });
  const { courses, chapters, tests } = await loadData();
  const byCourse = new Map<string, Array<{ id: string; title: string; course_id: string; status: string | null }>>();
  for (const ch of chapters) {
    if (!byCourse.has(ch.course_id)) byCourse.set(ch.course_id, []);
    byCourse.get(ch.course_id)!.push({ id: ch.id, title: ch.title, course_id: ch.course_id, status: ch.status });
  }
  const testCountCourse = (courseId: string) => tests.filter(t => t.course_id === courseId && (t.chapter_id == null)).length;
  const testCountChapter = (chapterId: string) => tests.filter(t => t.chapter_id === chapterId).length;
  const testsByCourse = (courseId: string) => tests.filter(t => t.course_id === courseId && t.chapter_id == null);
  const testsByChapter = (chapterId: string) => tests.filter(t => t.chapter_id === chapterId);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumbs" className="text-sm text-slate-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/admin" className="underline decoration-white/20 hover:decoration-white focus-ring rounded">
              Admin
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-slate-700 truncate max-w-[60ch]">
            確認テスト管理
          </li>
        </ol>
      </nav>
      <h1 className="text-xl font-semibold">確認テスト管理</h1>
      <p className="text-sm text-slate-600">各コース / チャプターごとの確認テスト一覧（作成・編集の動線は一旦非表示）。</p>

      <div className="space-y-3">
        {courses.map((c) => (
          <div key={c.id} className="rounded-2xl border border-brand-sky/20 bg-white">
            <div className="flex items-center justify-between border-b border-brand-sky/20 p-3">
              <div>
                <div className="text-base font-medium">{c.title}</div>
                <div className="text-xs text-slate-500">コース内テスト: {testCountCourse(c.id)} 件</div>
              </div>
            </div>

            <div className="p-3 space-y-3">
              {/* チャプター */}
              <div className="text-sm text-slate-600 mb-1">チャプター</div>
              <div className="space-y-2">
                {(byCourse.get(c.id) || []).map((ch) => (
                  <ChapterRow
                    key={ch.id}
                    title={ch.title}
                    count={testCountChapter(ch.id)}
                    tests={testsByChapter(ch.id)}
                    courseId={c.id}
                    chapterId={ch.id}
                    chapterStatus={ch.status}
                  />
                ))}
                {!(byCourse.get(c.id) || []).length && (
                  <div className="rounded-xl border border-brand-sky/20 bg-white p-3 text-sm text-slate-500">チャプターがありません</div>
                )}
              </div>
            </div>
          </div>
        ))}
        {!courses.length && (
          <div className="rounded-xl border border-brand-sky/20 bg-white p-4 text-sm text-slate-600">コースがありません。先にコースを作成してください。</div>
        )}
      </div>
    </div>
  );
}
