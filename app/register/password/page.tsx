import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { setOnboardingPassword } from '@/lib/onboarding/actions';
import { readOnboardingState } from '@/lib/onboarding/state';

export default async function RegisterPasswordPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(['user', 'staff', 'admin']);
  const state = readOnboardingState();
  const currentStep = state.step ?? 1;

  if (currentStep < 3) {
    redirect('/register/verify');
  }
  if (currentStep >= 5) {
    redirect('/register/done');
  }
  if (currentStep >= 4) {
    redirect('/register/profile');
  }

  const error = typeof searchParams?.error === 'string' ? searchParams.error : undefined;

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">パスワードを設定</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          ログインに使用するパスワードを設定してください。8文字以上で、推測されにくいものをおすすめします。
        </p>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <form action={setOnboardingPassword} className="space-y-6" noValidate>
        <div className="space-y-2">
          <label htmlFor="register-password" className="block text-sm font-medium text-[color:var(--color-text)]">
            パスワード
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-white px-4 py-3 text-[color:var(--color-text)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="register-password-confirm" className="block text-sm font-medium text-[color:var(--color-text)]">
            パスワード（確認）
          </label>
          <input
            id="register-password-confirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-white px-4 py-3 text-[color:var(--color-text)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--color-primary-button)] px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand"
        >
          保存して次へ進む
        </button>
      </form>
    </div>
  );
}
