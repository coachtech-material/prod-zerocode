"use client";
import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { setUserDisabledAction, deleteUserAction } from '@/app/(shell)/admin/user/actions';

type Row = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
  role: string;
  last_sign_in_at?: string | null;
  inactive?: boolean;
  phone?: string | null;
  issued_at?: string | null;
  login_disabled?: boolean;
};

type TableProps = {
  rows: Row[];
  showEmail?: boolean;
  showPhone?: boolean;
  showStatus?: boolean;
  renderActions?: (row: Row) => ReactNode;
};

function StatusBadge({ row }: { row: Row }) {
  if (row.login_disabled) {
    return (
      <span className="inline-flex items-center rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-600">
        停止中
      </span>
    );
  }
  if (row.inactive) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
        非ログイン
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600">
      アクティブ
    </span>
  );
}

function Table({ rows, showEmail, showPhone, showStatus, renderActions }: TableProps) {
  const today = Date.now();
  const totalCols =
    5 +
    (showEmail ? 1 : 0) +
    (showPhone ? 1 : 0) +
    (showStatus ? 1 : 0) +
    (renderActions ? 1 : 0);

  return (
    <div>
      <div className="hidden rounded-xl border border-brand-sky/20 sm:block">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-brand-sky/10 text-left text-slate-700">
              <tr>
                <th className="px-3 py-2">名前</th>
                {showEmail && <th className="px-3 py-2">メール</th>}
                {showPhone && <th className="px-3 py-2">電話番号</th>}
                {showStatus && <th className="px-3 py-2">ステータス</th>}
                <th className="px-3 py-2">受講開始日</th>
                <th className="px-3 py-2">利用日数</th>
                <th className="px-3 py-2">ロール</th>
                <th className="px-3 py-2">ID</th>
                {renderActions && <th className="px-3 py-2 text-right">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((row) => {
                const name =
                  [row.last_name || '', row.first_name || ''].filter(Boolean).join(' ').trim() ||
                  '(未設定)';
                const issuedDate = row.issued_at ? new Date(row.issued_at) : null;
                const issuedDisplay = issuedDate ? issuedDate.toLocaleDateString('ja-JP') : '-';
                const dayCount = issuedDate
                  ? Math.max(1, Math.floor((today - issuedDate.getTime()) / 86400000) + 1)
                  : null;
                return (
                  <tr key={row.id} className="hover:bg-white">
                    <td className="px-3 py-2 text-slate-800">{name}</td>
                    {showEmail && <td className="px-3 py-2 text-slate-700">{row.email || '-'}</td>}
                    {showPhone && <td className="px-3 py-2 text-slate-700">{row.phone || '-'}</td>}
                    {showStatus && (
                      <td className="px-3 py-2">
                        <StatusBadge row={row} />
                      </td>
                    )}
                    <td className="px-3 py-2 text-slate-700">{issuedDisplay}</td>
                    <td className="px-3 py-2 text-slate-700">{dayCount ? `${dayCount}日目` : '-'}</td>
                    <td className="px-3 py-2">
                      <code>{row.role}</code>
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      <code className="break-all">{row.id}</code>
                    </td>
                    {renderActions && (
                      <td className="px-3 py-2 text-right align-middle">{renderActions(row)}</td>
                    )}
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={totalCols}>
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => {
          const name =
            [row.last_name || '', row.first_name || ''].filter(Boolean).join(' ').trim() ||
            '(未設定)';
          const issuedDate = row.issued_at ? new Date(row.issued_at) : null;
          const dayCount = issuedDate
            ? Math.max(1, Math.floor((today - issuedDate.getTime()) / 86400000) + 1)
            : null;
          const actions = renderActions ? renderActions(row) : null;
          return (
            <div
              key={row.id}
              className="rounded-2xl border border-brand-sky/30 bg-white/60 p-4 text-sm shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-800">{name}</p>
                  {showEmail && (
                    <p className="mt-1 text-xs text-slate-500 break-all">{row.email || '—'}</p>
                  )}
                  {showPhone && (
                    <p className="mt-1 text-xs text-slate-500 break-all">{row.phone || '—'}</p>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {dayCount ? `${dayCount}日目` : issuedDate ? '計算中' : '—'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>受講開始日: {issuedDate ? issuedDate.toLocaleDateString('ja-JP') : '—'}</span>
                <span>ロール: <code>{row.role}</code></span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                {showStatus ? <StatusBadge row={row} /> : <span />}
                <code className="text-[11px] text-slate-400 break-all">{row.id}</code>
              </div>
              {actions ? <div className="mt-3 flex justify-end gap-2">{actions}</div> : null}
            </div>
          );
        })}
        {!rows.length && (
          <div className="rounded-2xl border border-dashed border-brand-sky/30 p-4 text-center text-sm text-slate-500">
            データがありません
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserTabs({
  students,
  ops,
  viewerRole,
}: {
  students: Row[];
  ops: Row[];
  viewerRole: 'user' | 'staff' | 'admin';
}) {
  const [tab, setTab] = useState<'students' | 'ops'>('students');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggleDisabled = (row: Row, disabled: boolean) => {
    setMessage(null);
    setPendingAction(`${row.id}-toggle`);
    startTransition(async () => {
      try {
        await setUserDisabledAction(row.id, disabled);
        router.refresh();
        setMessage(disabled ? 'ユーザーを停止しました。' : 'ユーザーの停止を解除しました。');
      } catch (error: any) {
        console.error(error);
        setMessage(error?.message ?? '操作に失敗しました。');
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleDelete = (row: Row) => {
    if (!confirm('選択したユーザーを完全に削除しますか？この操作は取り消せません。')) return;
    setMessage(null);
    setPendingAction(`${row.id}-delete`);
    startTransition(async () => {
      try {
        await deleteUserAction(row.id);
        router.refresh();
        setMessage('ユーザーを削除しました。');
      } catch (error: any) {
        console.error(error);
        setMessage(error?.message ?? 'ユーザーの削除に失敗しました。');
      } finally {
        setPendingAction(null);
      }
    });
  };

  const renderStudentActions = (row: Row) => {
    if (viewerRole !== 'admin') return null;
    const pending = isPending && pendingAction?.startsWith(row.id);
    return (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => handleToggleDisabled(row, !row.login_disabled)}
          disabled={pending}
          className={[
            'rounded-md px-3 py-1 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60',
            row.login_disabled
              ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25'
              : 'bg-rose-500/15 text-rose-600 hover:bg-rose-500/25',
          ].join(' ')}
        >
          {row.login_disabled ? '再開' : '停止'}
        </button>
        <button
          type="button"
          onClick={() => handleDelete(row)}
          disabled={pending}
          className="rounded-md bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          削除
        </button>
      </div>
    );
  };

  const renderOpsActions = (row: Row) => {
    if (viewerRole !== 'admin') return null;
    const pending = isPending && pendingAction?.startsWith(row.id);
    return (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => handleDelete(row)}
          disabled={pending}
          className="rounded-md bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          削除
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg bg-brand-sky/10 p-1">
        <button
          className={[
            'px-4 py-1.5 rounded-md text-sm transition',
            tab === 'students' ? 'bg-brand-yellow text-white' : 'text-slate-700',
          ].join(' ')}
          onClick={() => setTab('students')}
        >
          受講生一覧
        </button>
        <button
          className={[
            'px-4 py-1.5 rounded-md text-sm transition',
            tab === 'ops' ? 'bg-brand-yellow text-brand' : 'text-slate-700',
          ].join(' ')}
          onClick={() => setTab('ops')}
        >
          運営一覧
        </button>
      </div>

      {message ? (
        <div className="rounded-lg border border-brand-sky/30 bg-brand-sky/10 px-4 py-2 text-xs text-brand">
          {message}
        </div>
      ) : null}

      {tab === 'students' ? (
        <Table
          rows={students}
          showEmail
          showPhone
          showStatus
          renderActions={viewerRole === 'admin' ? (row) => renderStudentActions(row) : undefined}
        />
      ) : (
        <Table
          rows={ops}
          renderActions={viewerRole === 'admin' ? (row) => renderOpsActions(row) : undefined}
        />
      )}
    </div>
  );
}
