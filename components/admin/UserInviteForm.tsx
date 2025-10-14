"use client";

import { useState, useTransition } from 'react';
import { inviteOperatorAction } from '@/app/(shell)/admin/user/actions';

export default function UserInviteForm({ viewerRole }: { viewerRole: 'user' | 'staff' | 'admin' }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (viewerRole !== 'admin') {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      try {
        await inviteOperatorAction(formData);
        setMessage('招待メールを送信しました。');
        setEmail('');
        setRole('staff');
      } catch (error: any) {
        setMessage(error?.message ?? '招待に失敗しました。');
      }
    });
  };

  return (
    <div className="rounded-2xl border border-brand-sky/20 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">運営ユーザーを招待</h2>
      <p className="mt-1 text-xs text-slate-500">メールアドレス宛に初回登録メールを送信します。</p>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600" htmlFor="invite-email">
            メールアドレス
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="ops@example.com"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="invite-role">
              ロール
            </label>
            <select
              id="invite-role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as 'staff' | 'admin')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="staff">スタッフ</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? '送信中…' : '招待メールを送信'}
          </button>
        </div>
      </form>
      {message && (
        <p className="mt-3 text-xs text-brand">{message}</p>
      )}
    </div>
  );
}
