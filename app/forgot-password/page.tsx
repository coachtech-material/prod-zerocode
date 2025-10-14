import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import Logo from '@/icon/zerocode-logo.svg';

export const metadata: Metadata = {
  title: 'パスワード再設定 | zerocode',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[color:var(--color-surface-strong)]">
      <div className="grid min-h-screen w-full grid-cols-1 overflow-hidden lg:grid-cols-[minmax(320px,0.38fr)_minmax(360px,0.62fr)]">
        <div className="relative flex min-h-[240px] flex-col justify-between bg-[color:var(--user-hero)] px-8 py-12 text-white sm:px-10 lg:px-12">
          <Link href="/" className="inline-flex items-center" aria-label="ホームへ戻る">
            <Image src={Logo} alt="zerocode" className="h-7 w-auto" priority />
          </Link>
          <div className="mt-16 lg:mt-24">
            <p className="text-3xl font-semibold leading-tight sm:text-[34px]">パスワードを再設定</p>
            <p className="mt-4 text-sm text-white/90">
              ご登録のメールアドレス宛に再設定用のリンクをお送りします。
            </p>
          </div>
          <div className="mt-10 lg:mt-auto" />
        </div>

        <div className="flex items-center bg-[color:var(--color-surface)] px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-semibold text-[color:var(--color-text)] sm:text-[26px]">
              メールアドレスを入力してください
            </h2>
            <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">
              再設定リンクを送信します。
            </p>

            <ForgotPasswordForm />

            <div className="text-right text-sm">
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
