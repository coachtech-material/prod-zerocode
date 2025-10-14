import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AddCourseButton from '@/components/admin/AddCourseButton';
import ToastFromQuery from '@/components/ui/ToastFromQuery';

function Message({ searchParams }: { searchParams?: { [k: string]: string | string[] | undefined } }) {
  const err = typeof searchParams?.error === 'string' ? searchParams!.error : undefined;
  const msg = typeof searchParams?.message === 'string' ? searchParams!.message : undefined;
  if (!err && !msg) return null;
  return (
    <div className={['rounded-xl border p-3 text-sm', err ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'].join(' ')}>
      {err || msg}
    </div>
  );
}

export default async function AdminCoursesPage({ searchParams }: { searchParams?: { [k: string]: string | string[] | undefined } }) {
  await requireRole(['staff','admin'], { redirectTo: '/ops-login', signOutOnFail: true });
  const supabase = createServerSupabaseClient();
  const { data: courses } = await supabase
    .from('courses')
    .select('id,title,status,sort_key')
    .is('deleted_at', null)
    .order('sort_key', { ascending: true });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">コース管理</h1>
      <ToastFromQuery />

      <div className="rounded-2xl border border-brand-sky/20 bg-white p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-medium">コース一覧</h2>
          <AddCourseButton />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white text-slate-600">
            <tr>
              <th className="text-left px-4 py-2 w-24">キー</th>
              <th className="text-left px-4 py-2">コース名</th>
              <th className="text-left px-4 py-2 w-28">公開ステータス</th>
            </tr>
          </thead>
          <tbody>
            {(courses || []).map((c) => (
              <tr key={c.id} className="border-t border-brand-sky/20 hover:bg-white">
                <td className="px-4 py-2 align-middle">{c.sort_key}</td>
                <td className="px-4 py-2 align-middle">
                  <Link href={`/admin/courses/${c.id}`} className="underline decoration-white/20 hover:decoration-white">
                    {c.title}
                  </Link>
                </td>
                <td className="px-4 py-2 align-middle">
                  <span className="text-xs rounded-full bg-brand-sky/10 px-2 py-1">
                    {c.status === 'published' ? '公開' : '非公開'}
                  </span>
                </td>
              </tr>
            ))}
            {!courses?.length && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={3}>まだコースがありません。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
