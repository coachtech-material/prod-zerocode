"use client";

import { useFormState, useFormStatus } from 'react-dom';
import { completeOpsOnboarding } from '@/app/ops-onboarding/actions';
import { initialOpsOnboardingState } from '@/app/ops-onboarding/state';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? '保存中…' : '登録して管理画面へ進む'}
    </button>
  );
}

export default function OpsOnboardingForm({ email }: { email: string }) {
  const [state, formAction] = useFormState(completeOpsOnboarding, initialOpsOnboardingState);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">メールアドレス</label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {email || '-'}
        </div>
        <p className="text-xs text-slate-400">このメールアドレスでログインできます。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="ops-onboarding-password" className="text-xs font-medium text-slate-600">
            パスワード
          </label>
          <input
            id="ops-onboarding-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p className="text-xs text-slate-400">8文字以上で入力してください。</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="ops-onboarding-confirm" className="text-xs font-medium text-slate-600">
            パスワード（確認）
          </label>
          <input
            id="ops-onboarding-confirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
