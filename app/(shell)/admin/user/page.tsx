import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import UserTabs from '@/components/admin/UserTabs';
import UserInviteForm from '@/components/admin/UserInviteForm';

export const dynamic = 'force-dynamic';

export default async function AdminUserPage() {
  const { profile } = await requireRole(['staff','admin'], { redirectTo: '/ops-login', signOutOnFail: true });
  const supabase = createServerSupabaseClient();

  const [{ data: stu }, { data: ops }] = await Promise.all([
    supabase.rpc('ops_list_users_with_status'),
    supabase.rpc('ops_list_staff_admin'),
  ]);

  const students = (stu || []).map((r: any) => ({
    id: r.id as string,
    first_name: r.first_name as string | null,
    last_name: r.last_name as string | null,
    email: (r.email as string | null) ?? null,
    role: 'user',
    last_sign_in_at: r.last_sign_in_at as string | null,
    inactive: !!r.inactive,
    phone: (r.phone as string | null) ?? null,
    issued_at: (r.issued_at as string | null) ?? null,
    login_disabled: !!r.login_disabled,
  }));
  const operators = (ops || []).map((r: any) => ({
    id: r.id as string,
    first_name: r.first_name as string | null,
    last_name: r.last_name as string | null,
    role: r.role as string,
    issued_at: (r.issued_at as string | null) ?? null,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ユーザー管理</h1>
      <UserInviteForm viewerRole={profile.role} />
      <UserTabs students={students} ops={operators} viewerRole={profile.role} />
    </div>
  );
}
