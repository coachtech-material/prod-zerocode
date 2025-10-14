import { redirect } from 'next/navigation';
import InviteSessionHandler from '@/components/onboarding/InviteSessionHandler';
import OpsOnboardingForm from '@/components/onboarding/OpsOnboardingForm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic';

export default async function OpsOnboardingPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        <InviteSessionHandler redirectPath="/ops-onboarding" />
        <h1 className="text-2xl font-semibold text-slate-800">招待リンクを確認しています...</h1>
        <p className="text-sm text-slate-600">
          ブラウザが開かれたまましばらくお待ちください。自動的にページが切り替わらない場合は、招待メール内のリンクを再度クリックしてください。
        </p>
      </div>
    );
  }

  const { profile } = await requireRole(['staff', 'admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
  });

  const step = profile.onboarding_step ?? 0;

  if (step >= 5) {
    redirect('/admin');
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <InviteSessionHandler redirectPath="/ops-onboarding" />
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">運営アカウントの初期設定</h1>
        <p className="text-sm text-slate-600">
          新しいパスワードを設定すると、管理画面に移動します。
        </p>
      </header>
      <div className="rounded-3xl border border-brand-sky/20 bg-white p-6 shadow-[0_12px_40px_rgba(65,120,255,0.08)]">
        <OpsOnboardingForm email={user.email ?? ''} />
      </div>
    </div>
  );
}
