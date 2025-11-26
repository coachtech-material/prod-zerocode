import Link from 'next/link';
import { requireRole } from '@/lib/auth/requireRole';

export default async function AdminTestIndexPage() {
  await requireRole(['staff','admin'], { redirectTo: '/ops-login', signOutOnFail: true });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">テスト管理</h1>
      <div className="space-y-4">
        <Link
          href="/admin/test/comfirm"
          className="rounded-2xl border border-white/10 bg-[color:var(--surface-1)] p-4 text-[color:var(--text)] shadow-[0_15px_35px_rgba(0,0,0,0.35)] transition hover:bg-white/5 focus-ring"
        >
          <div className="text-base font-medium">確認テストの管理</div>
          <p className="mt-1 text-sm text-[color:var(--muted)]">確認テストの作成、編集、プレビュー実行。</p>
        </Link>
      </div>
    </div>
  );
}
