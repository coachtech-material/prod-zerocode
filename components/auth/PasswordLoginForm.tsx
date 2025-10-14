import Link from 'next/link';
import FormSubmitButton from '@/components/auth/FormSubmitButton';

type Props = {
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  errorMessage?: string;
};

export default function PasswordLoginForm({ action, submitLabel = 'ログイン', errorMessage }: Props) {
  return (
    <form action={action} className="mt-6 space-y-6" noValidate>
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="password-login-email" className="block text-sm font-medium text-[color:var(--color-text)]">
          メールアドレス <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="password-login-email"
          name="email"
          type="email"
          required
          aria-required="true"
          autoComplete="username"
          placeholder="メールアドレスを入力"
          className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-white px-4 py-3 text-[color:var(--color-text)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password-login-password" className="block text-sm font-medium text-[color:var(--color-text)]">
          パスワード <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="password-login-password"
          name="password"
          type="password"
          required
          aria-required="true"
          autoComplete="current-password"
          placeholder="パスワードを入力"
          className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-white px-4 py-3 text-[color:var(--color-text)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand"
        />
      </div>

      <FormSubmitButton>{submitLabel}</FormSubmitButton>

      <div className="text-right">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-brand underline underline-offset-4"
        >
          パスワードを忘れた方はコチラ
        </Link>
      </div>
    </form>
  );
}
