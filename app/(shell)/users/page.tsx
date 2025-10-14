import { requireRole } from '@/lib/auth/requireRole';

export default async function UsersPage() {
  await requireRole(['staff','admin']);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ユーザー</h1>
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-6 text-slate-600">このページはダミーです。</div>
    </div>
  );
}
