import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import Logo from '@/icon/zerocode-logo.svg';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import ThemeToggle from '@/components/theme/ThemeToggle';

export const metadata: Metadata = {
  title: 'パスワードの再設定 | zerocode',
};

type SearchParams = { [key: string]: string | string[] | undefined };

export default function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const rawError = typeof searchParams?.error === 'string' ? searchParams.error : undefined;
  const errorMessage = rawError ? decodeURIComponent(rawError) : undefined;

  return (
    <div className="relative min-h-screen bg-[color:var(--color-surface-strong)]">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle variant="secondary" />
      </div>
      <div className="grid min-h-screen w-full grid-cols-1 overflow-hidden lg:grid-cols-[minmax(320px,0.38fr)_minmax(360px,0.62fr)]">
        <div className="relative flex min-h-[240px] flex-col justify-between bg-[color:var(--user-hero)] px-8 py-12 text-white sm:px-10 lg:px-12">
          <Link href="/" className="inline-flex items-center" aria-label="ホームへ戻る">
            <Image src={Logo} alt="zerocode" className="h-7 w-auto" priority />
          </Link>
          <div className="mt-16 lg:mt-24">
            <p className="text-3xl font-semibold leading-tight sm:text-[34px]">新しいパスワードを設定</p>
            <p className="mt-4 text-sm text-white/90">
              安全のため、これまで使用していないパスワードを設定してください。
            </p>
          </div>
          <div className="mt-10 lg:mt-auto" />
        </div>

        <div className="flex items-center bg-[color:var(--color-surface)] px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-semibold text-[color:var(--color-text)] sm:text-[26px]">
              新しいパスワードを入力してください
            </h2>
            <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">
              設定後はログイン画面に戻ります。
            </p>
            <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
              再度パスワードリセットのメールを飛ばして欲しい場合は、「ログイン画面に戻る」ボタンを押下し、再度パスワード再設定の動線から認証メールを送信してください。
            </p>

            <ResetPasswordForm errorMessage={errorMessage} />

            <div className="mt-6 text-right text-sm">
              <Link href="/login" className="font-medium text-brand underline underline-offset-4">
                ログイン画面に戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
