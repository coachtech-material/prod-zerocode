"use client";

import { useMemo, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ForgotPasswordForm() {
  const supabase = useMemo(
    () =>
      createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            flowType: 'implicit',
            persistSession: true,
            autoRefreshToken: false,
          },
        }
      ),
    []
  );
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();

    if (!email) {
      setError('メールアドレスを入力してください');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('zerocode:password-reset-email', email);
    }
    const redirectTo = origin ? `${origin}/reset-password` : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      console.error('Failed to send password reset email', resetError);
      setError(resetError.message);
      setStatus('error');
      return;
    }

    setStatus('success');
    form.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/15 px-4 py-3 text-sm text-[color:var(--danger)]"
        >
          {error}
        </div>
      )}
      {status === 'success' && (
        <div
          role="status"
          className="rounded-xl border border-[color:var(--success)]/50 bg-[color:var(--success)]/15 px-4 py-3 text-sm text-[color:var(--success)]"
        >
          再設定用のメールを送信しました。記載の手順に従ってください。
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="reset-email" className="block text-sm font-medium text-[color:var(--text)]">
          メールアドレス <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          required
          aria-required="true"
          autoComplete="email"
          placeholder="メールアドレスを入力"
          className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)] px-4 py-3 text-[color:var(--text)] shadow-[var(--shadow-1)] focus-ring"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--brand-strong)] px-4 py-3 text-sm font-semibold text-white focus-ring disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === 'submitting' ? '送信中…' : '再設定メールを送信'}
      </button>
    </form>
  );
}
