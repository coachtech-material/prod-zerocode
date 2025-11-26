import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import TestManagementTable from '@/components/admin/TestManagementTable';
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
      .select('id,title,course_id,chapter_id,status,mode,deleted_at,test_sort_key,created_at')
      .is('deleted_at', null)
      .order('test_sort_key', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);
  return { courses: courses || [], chapters: chapters || [], tests: tests || [] } as {
    courses: Array<{ id: string; title: string; status: string | null; deleted_at: string | null; sort_key?: number | null; created_at?: string | null }>,
    chapters: Array<{ id: string; title: string; course_id: string; status: string | null; deleted_at: string | null; chapter_sort_key?: number | null; created_at?: string | null }>,
    tests: Array<{ id: string; title: string; course_id: string | null; chapter_id: string | null; status: string | null; mode?: string | null; test_sort_key?: number | null; deleted_at: string | null; created_at?: string | null }>,
  };
}

export default async function AdminConfirmManagePage() {
  await requireRole(['staff','admin'], { redirectTo: '/ops-login', signOutOnFail: true });
  const { courses, chapters, tests } = await loadData();
  const chaptersByCourse = chapters.reduce<Record<string, typeof chapters>>((acc, chapter) => {
    if (!acc[chapter.course_id]) acc[chapter.course_id] = [];
    acc[chapter.course_id].push(chapter);
    return acc;
  }, {});
  const testsByCourse = tests.reduce<Record<string, typeof tests>>((acc, test) => {
    if (!test.course_id || !test.chapter_id) return acc;
    if (!acc[test.course_id]) acc[test.course_id] = [];
    acc[test.course_id].push(test);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumbs" className="text-sm text-[color:var(--muted)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/admin" className="underline decoration-white/20 hover:decoration-white focus-ring rounded">
              Admin
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="max-w-[60ch] truncate text-[color:var(--text)]">
            確認テスト管理
          </li>
        </ol>
      </nav>
      <h1 className="text-xl font-semibold">確認テスト管理</h1>
      <p className="text-sm text-[color:var(--muted)]">各コース / チャプターごとの確認テスト一覧（作成・編集の動線は一旦非表示）。</p>

      <div className="space-y-4">
        {courses.map((course) => (
          <TestManagementTable
            key={course.id}
            courseId={course.id}
            courseTitle={course.title}
            chapters={chaptersByCourse[course.id] || []}
            tests={testsByCourse[course.id] || []}
          />
        ))}
        {!courses.length && (
          <div className="rounded-xl border border-white/10 bg-[color:var(--surface-1)] p-4 text-sm text-[color:var(--muted)]">コースがありません。先にコースを作成してください。</div>
        )}
      </div>
    </div>
  );
}
