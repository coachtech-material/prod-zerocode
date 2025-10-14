import { requireRole } from '@/lib/auth/requireRole';

export default async function AdminPage() {
  await requireRole(['staff','admin'], { redirectTo: '/ops-login', signOutOnFail: true });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-4 shadow-sm">
        <p>You are staff/admin.</p>
      </div>
    </div>
  );
}
