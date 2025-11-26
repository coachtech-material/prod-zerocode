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

      <div className="rounded-2xl border border-white/10 bg-[color:var(--surface-1)] p-0 shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h2 className="font-medium text-[color:var(--text)]">コース一覧</h2>
          <AddCourseButton />
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-[640px] w-full text-sm text-[color:var(--text)]">
            <thead className="bg-[color:var(--surface-2)] text-[color:var(--muted)]">
              <tr>
                <th className="w-24 px-4 py-2 text-left">キー</th>
                <th className="px-4 py-2 text-left">コース名</th>
                <th className="w-28 px-4 py-2 text-left">公開ステータス</th>
              </tr>
            </thead>
            <tbody>
              {(courses || []).map((c) => (
                <tr key={c.id} className="border-t border-white/5 transition hover:bg-white/5">
                  <td className="px-4 py-2 align-middle text-[color:var(--muted)]">{c.sort_key}</td>
                  <td className="px-4 py-2 align-middle">
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="text-[color:var(--text)] underline decoration-white/20 transition hover:decoration-white"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <span className="rounded-full bg-brand-sky/20 px-2 py-1 text-xs text-[color:var(--text)]">
                      {c.status === 'published' ? '公開' : '非公開'}
                    </span>
                  </td>
                </tr>
              ))}
              {!courses?.length && (
                <tr>
                  <td className="px-4 py-6 text-[color:var(--muted)]" colSpan={3}>
                    まだコースがありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 border-t border-white/5 px-4 py-4 sm:hidden">
          {(courses || []).map((c) => (
            <Link
              key={c.id}
              href={`/admin/courses/${c.id}`}
              className="block rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--text)] shadow-sm transition hover:border-white/20 hover:bg-white/10 focus-ring"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
                  <span className="rounded-full bg-brand-sky/20 px-2 py-0.5 font-semibold text-brand">
                    #{c.sort_key}
                  </span>
                  {c.status === 'published' ? '公開中' : '非公開'}
                </span>
                <span className="text-xs text-[color:var(--muted)]">詳細を見る</span>
              </div>
              <p className="mt-2 text-base font-semibold text-[color:var(--text)]">{c.title}</p>
            </Link>
          ))}
          {!courses?.length && (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-sm text-[color:var(--muted)]">
              まだコースがありません。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
