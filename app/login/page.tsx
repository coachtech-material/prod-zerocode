import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import PasswordLoginForm from '@/components/auth/PasswordLoginForm';
import { signIn } from '@/lib/auth/actions';
import { startOnboarding } from '@/lib/onboarding/actions';
import Logo from '@/icon/zerocode-logo.svg';

export const metadata: Metadata = {
  title: 'マイページログイン | zerocode',
};

type SearchParams = { [key: string]: string | string[] | undefined };

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const rawError = typeof searchParams?.error === 'string' ? searchParams.error : undefined;
  const errorMessage = rawError ? decodeURIComponent(rawError) : undefined;
  const rawMessage = typeof searchParams?.message === 'string' ? searchParams.message : undefined;
  const infoMessage = rawMessage ? decodeURIComponent(rawMessage) : undefined;

  return (
    <div className="relative min-h-screen bg-[color:var(--color-surface-strong)]">
      <div className="grid min-h-screen w-full grid-cols-1 overflow-hidden lg:grid-cols-[minmax(320px,0.38fr)_minmax(360px,0.62fr)]">
        <div className="relative flex min-h-[240px] flex-col justify-between bg-[color:var(--user-hero)] px-8 py-12 text-white sm:px-10 lg:px-12">
          <Link href="/" className="inline-flex items-center" aria-label="ホームへ戻る">
            <Image src={Logo} alt="zerocode" className="h-7 w-auto" priority />
          </Link>
          <div className="mt-16 lg:mt-24">
            <p className="text-3xl font-semibold leading-tight sm:text-[34px]">マイページへログイン</p>
            <div className="mt-4" />
          </div>
          <div className="mt-10 lg:mt-auto" />
        </div>

        <div className="flex items-center bg-[color:var(--color-surface)] px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-semibold text-[color:var(--color-text)] sm:text-[26px]">
              メールアドレスでログイン
            </h2>
            <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">
              登録済みのメールアドレスとパスワードを入力してください。
            </p>

            {infoMessage && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {infoMessage}
              </div>
            )}

            <PasswordLoginForm action={signIn} errorMessage={errorMessage} submitLabel="ログイン" />

            <div className="mt-8 flex items-center gap-4 text-xs text-[color:var(--color-text-muted)]">
              <span className="h-px flex-1 bg-[color:var(--color-outline)]" />
              <span>または</span>
              <span className="h-px flex-1 bg-[color:var(--color-outline)]" />
            </div>

            <div className="mt-6 space-y-3">
              <form action={startOnboarding} className="w-full">
                <button
                  type="submit"
                  className="w-full rounded-xl border border-[color:var(--color-outline)] px-4 py-3 text-center text-sm font-semibold text-[color:var(--color-text)] transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  会員登録はコチラ
                </button>
              </form>
              <Link
                href="/ops-login"
                className="block w-full rounded-xl border border-[color:var(--color-outline)] px-4 py-3 text-center text-sm font-semibold text-[color:var(--color-text)] transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                管理者ログインはコチラ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
