import Link from 'next/link';
import { submitOnboardingEmail } from '@/lib/onboarding/actions';
import { readOnboardingState } from '@/lib/onboarding/state';

export default function RegisterEmailPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const state = readOnboardingState();
  const error = typeof searchParams?.error === 'string' ? searchParams!.error : undefined;

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">メールアドレスを登録</h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">ログインに使用するメールアドレスを入力し、認証リンクを受け取ってください。</p>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <form action={submitOnboardingEmail} className="space-y-6" noValidate>
        <div className="space-y-2">
          <label htmlFor="register-email" className="block text-sm font-medium text-[color:var(--color-text)]">メールアドレス</label>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="example@example.com"
            className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-white px-4 py-3 text-[color:var(--color-text)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>
        <button type="submit" className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--color-primary-button)] px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand">
          認証メールを送信
        </button>
      </form>
      <div className="text-sm text-[color:var(--color-text-muted)]">
        既にアカウントをお持ちですか？{' '}
        <Link href="/login" className="font-medium text-brand underline underline-offset-4">ログインに戻る</Link>
      </div>
    </div>
  );
}
