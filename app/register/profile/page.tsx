import { redirect } from 'next/navigation';
import AvatarUploader from '@/components/register/AvatarUploader';
import { completeOnboardingProfile } from '@/lib/onboarding/actions';
import { readOnboardingState } from '@/lib/onboarding/state';
import { requireRole, getOrCreateProfile } from '@/lib/auth/requireRole';

export default async function RegisterProfilePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { profile } = await requireRole(['user', 'staff', 'admin']);
  const state = readOnboardingState();
  const currentStep = state.step ?? 1;
  if (currentStep < 3) {
    redirect('/register/verify');
  }
  if (currentStep < 4) {
    redirect('/register/password');
  }
  if (currentStep >= 5) {
    redirect('/register/done');
  }
  const error = typeof searchParams?.error === 'string' ? searchParams!.error : undefined;
  const accountProfile = await getOrCreateProfile(profile.id);

  return (
    <div className="mx-auto w-full max-w-xl space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">プロフィール設定</h1>
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-red-500">必ず正しい漢字で姓名を入力してください。</p>
          <p className="text-[color:var(--color-text-muted)]">電話番号はハイフン無しの10桁または11桁で入力してください。</p>
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <form action={completeOnboardingProfile} className="space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[color:var(--color-text)]">姓</span>
            <input
              name="last_name"
              type="text"
              required
              defaultValue={accountProfile.last_name || ''}
              className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-white px-4 py-3 text-[color:var(--color-text)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[color:var(--color-text)]">名</span>
            <input
              name="first_name"
              type="text"
              required
              defaultValue={accountProfile.first_name || ''}
              className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-white px-4 py-3 text-[color:var(--color-text)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </label>
        </div>
        <div className="space-y-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[color:var(--color-text)]">電話番号</span>
            <input
              name="phone"
              type="tel"
              required
              inputMode="tel"
              pattern="[0-9]+"
              maxLength={11}
              defaultValue={accountProfile.phone || ''}
              placeholder="09012345678"
              className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-white px-4 py-3 text-[color:var(--color-text)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </label>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--color-text)]">アバター画像（任意）</span>
          <AvatarUploader initialUrl={accountProfile.avatar_url || null} />
        </div>
        <button type="submit" className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--color-primary-button)] px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand">
          保存
        </button>
      </form>
    </div>
  );
}
