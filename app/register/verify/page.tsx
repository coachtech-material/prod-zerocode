import Link from 'next/link';
import { redirect } from 'next/navigation';
import VerificationWatcher from '@/components/register/VerificationWatcher';
import { resendOnboardingEmail, markEmailVerified } from '@/lib/onboarding/actions';
import { readOnboardingState } from '@/lib/onboarding/state';

export default function RegisterVerifyPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const state = readOnboardingState();
  const step = state.step ?? 1;
  if (!state.email) {
    redirect('/register/email');
  }
  if (step < 2) {
    redirect('/register/email');
  }
  if (step >= 5) {
    redirect('/register/done');
  }
  if (step >= 4) {
    redirect('/register/profile');
  }
  if (step >= 3) {
    redirect('/register/password');
  }

  const error = typeof searchParams?.error === 'string' ? searchParams!.error : undefined;
  const sent = typeof searchParams?.sent === 'string';
  const resent = typeof searchParams?.resent === 'string';

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <VerificationWatcher formId="verify-complete-form" />
      <div>
        <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">メールを確認してください</h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{state.email} 宛に認証メールを送信しました。届いたメールのリンクをクリックすると次のステップへ進みます。</p>
      </div>
      {sent && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">認証メールを送信しました。</div>
      )}
      {resent && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">再送しました。数分経っても届かない場合は迷惑メールフォルダをご確認ください。</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <div className="space-y-4 rounded-2xl border border-brand-sky/20 bg-white px-6 py-5">
        <p className="text-sm text-slate-700">メールが届かない場合は以下をお試しください。</p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>迷惑メールフォルダを確認する</li>
          <li>別のメールアドレスを使用する</li>
        </ul>
        <form action={resendOnboardingEmail}>
          <button type="submit" className="text-sm font-medium text-brand underline underline-offset-4">認証メールを再送</button>
        </form>
      </div>
      <div className="space-y-3 border-t border-dashed border-brand-sky/30 pt-6 text-sm text-[color:var(--color-text-muted)]">
        <p>メールが認証されたら自動で次に進みます。手動で進む場合はこちら。</p>
        <form id="verify-complete-form" action={markEmailVerified} />
        <button
          form="verify-complete-form"
          className="inline-flex items-center justify-center rounded-xl bg-brand-sky px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          認証が完了しました
        </button>
      </div>
      <div className="text-sm text-[color:var(--color-text-muted)]">
        メール変更が必要ですか？{' '}
        <Link href="/register/email" className="font-medium text-brand underline underline-offset-4">メールアドレスを変更する</Link>
      </div>
    </div>
  );
}
