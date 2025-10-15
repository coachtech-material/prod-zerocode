"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabaseBrowserClient } from '@/lib/supabase/use-browser-client';

type Props = {
  errorMessage?: string;
};

export default function ResetPasswordForm({ errorMessage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseBrowserClient();

  const token = searchParams.get('token');
  const type = (searchParams.get('type') || 'recovery') as 'recovery' | 'email' | 'magiclink';
  const emailParam = searchParams.get('email');
  const code = searchParams.get('code');
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');

  const translateSessionError = (message?: string | null) => {
    if (!message) {
      return 'リンクの検証に失敗しました。もう一度お試しください。';
    }
    const lowercase = message.toLowerCase();
    if (lowercase.includes('code verifier') || lowercase.includes('code and code verifier')) {
      return '再設定リンクの情報が不足しています。メールの「パスワードを再設定」リンクをもう一度押してください。';
    }
    return message;
  };

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<'idle' | 'pending' | 'ready' | 'error'>('idle');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setRecoveryEmail(emailParam);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('zerocode:password-reset-email', emailParam);
      }
      return;
    }
    if (typeof window === 'undefined') return;
    const storedEmail = window.sessionStorage.getItem('zerocode:password-reset-email');
    if (storedEmail) {
      setRecoveryEmail(storedEmail);
    }
  }, [emailParam]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.startsWith('#')
      ? new URLSearchParams(window.location.hash.substring(1))
      : null;
    const accessToken = hash?.get('access_token');
    const refreshToken = hash?.get('refresh_token');
    let isMounted = true;

    const cleanUrl = (callback: (url: URL) => void) => {
      const url = new URL(window.location.href);
      callback(url);
      window.history.replaceState({}, document.title, url.toString());
    };

    const handleError = (message?: string | null) => {
      if (!isMounted) return;
      setSessionError(translateSessionError(message));
      setSessionState('error');
    };

    const attemptVerifyOtp = async (overrideToken?: string | null) => {
      const recoveryToken = overrideToken ?? token;
      if (!recoveryToken || !recoveryEmail) {
        handleError();
        return false;
      }
      setSessionState('pending');
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: recoveryEmail,
          token: recoveryToken,
          type,
        });
        if (!isMounted) {
          return false;
        }
        if (error || !data.session) {
          console.error('Failed to verify recovery token', error);
          handleError(error?.message);
          return false;
        }
        setSessionState('ready');
        setSessionError(null);
        cleanUrl((url) => {
          url.searchParams.delete('token');
          if (overrideToken && overrideToken === code) {
            url.searchParams.delete('code');
          }
        });
        return true;
      } catch (error) {
        console.error('Unexpected error verifying token', error);
        handleError(error instanceof Error ? error.message : String(error));
        return false;
      }
    };

    const attemptExchangeCode = async () => {
      if (!code) return false;
      setSessionState('pending');
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!isMounted) {
          return false;
        }
        if (error || !data.session) {
          console.error('Failed to exchange auth code for session', error);
          const recovered = await attemptVerifyOtp(code);
          if (recovered) {
            cleanUrl((url) => url.searchParams.delete('code'));
            return true;
          }
          handleError(error?.message);
          return false;
        }
        setSessionState('ready');
        setSessionError(null);
        cleanUrl((url) => url.searchParams.delete('code'));
        return true;
      } catch (error) {
        console.error('Unexpected error exchanging auth code', error);
        const recovered = await attemptVerifyOtp(code);
        if (recovered) {
          cleanUrl((url) => url.searchParams.delete('code'));
          return true;
        }
        handleError(error instanceof Error ? error.message : String(error));
        return false;
      }
    };

    const setSessionFromHash = async () => {
      if (!accessToken || !refreshToken) return false;
      setSessionState('pending');
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!isMounted) {
          return false;
        }
        if (error) {
          console.error('Failed to set session from hash tokens', error);
          handleError(error.message);
          return false;
        }
        setSessionState('ready');
        setSessionError(null);
        cleanUrl((url) => {
          url.hash = '';
        });
        return true;
      } catch (error) {
        console.error('Unexpected error setting session', error);
        handleError(error instanceof Error ? error.message : String(error));
        return false;
      }
    };

    (async () => {
      if (await setSessionFromHash()) return;
      if (await attemptExchangeCode()) return;
      if (code) return;
      if (token && recoveryEmail) {
        await attemptVerifyOtp();
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [supabase, token, type, code, recoveryEmail]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') || '').trim();
    const confirm = String(formData.get('confirm') || '').trim();

    if (!password || !confirm) {
      setSubmitError('新しいパスワードを入力してください');
      return;
    }
    if (password !== confirm) {
      setSubmitError('パスワードが一致していません');
      return;
    }

    const hasSession = sessionState === 'ready';

    if (!hasSession) {
      setSubmitError('再設定リンクが無効です。もう一度メールからアクセスしてください。');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      console.error('Failed to update password', updateError);
      setSubmitError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('zerocode:password-reset-email');
    }
    router.push('/login?message=' + encodeURIComponent('パスワードを更新しました。新しいパスワードでログインしてください'));
  };

  const canSubmit = !isSubmitting && sessionState === 'ready';
  const shouldShowMissingInfoNotice =
    sessionState !== 'ready' &&
    !submitError &&
    sessionState !== 'pending' &&
    !sessionError;

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/15 px-4 py-3 text-sm text-[color:var(--danger)]"
        >
          {errorMessage}
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/15 px-4 py-3 text-sm text-[color:var(--danger)]"
        >
          {submitError}
        </div>
      )}

      {sessionState === 'pending' && (
        <div
          role="status"
          className="rounded-xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/18 px-4 py-3 text-sm text-[color:var(--warning)]"
        >
          リンク情報を確認しています…
        </div>
      )}

      {sessionState === 'error' && sessionError && (
        <div
          role="alert"
          className="rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/15 px-4 py-3 text-sm text-[color:var(--danger)]"
        >
          {sessionError}
        </div>
      )}

      {shouldShowMissingInfoNotice && (
        <div
          role="alert"
          className="rounded-xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/18 px-4 py-3 text-sm text-[color:var(--warning)]"
        >
          再設定リンクが無効か、必要な情報が不足しています。メールの「パスワードを再設定」リンクをもう一度押してください。
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="new-password" className="block text-sm font-medium text-[color:var(--text)]">
          新しいパスワード <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          required
          aria-required="true"
          autoComplete="new-password"
          placeholder="新しいパスワードを入力"
          className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)] px-4 py-3 text-[color:var(--text)] shadow-[var(--shadow-1)] focus-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="new-password-confirm" className="block text-sm font-medium text-[color:var(--text)]">
          新しいパスワード（確認） <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="new-password-confirm"
          name="confirm"
          type="password"
          required
          aria-required="true"
          autoComplete="new-password"
          placeholder="同じパスワードを再入力"
          className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)] px-4 py-3 text-[color:var(--text)] shadow-[var(--shadow-1)] focus-ring"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--brand-strong)] px-4 py-3 text-sm font-semibold text-white focus-ring disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? '更新中…' : 'パスワードを更新'}
      </button>
    </form>
  );
}
