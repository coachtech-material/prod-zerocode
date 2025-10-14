import Link from 'next/link';
import { requireRole } from '@/lib/auth/requireRole';

export default async function AdminTestIndexPage() {
  await requireRole(['staff','admin'], { redirectTo: '/ops-login', signOutOnFail: true });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">テスト管理</h1>
      <div className="space-y-4">
        <Link href="/admin/test/comfirm" className="rounded-2xl border border-brand-sky/20 bg-white p-4 hover:bg-brand-sky/10 focus-ring">
          <div className="text-base font-medium">確認テストの管理</div>
          <p className="mt-1 text-sm text-slate-600">確認テストの作成、編集、プレビュー実行。</p>
        </Link>
      </div>
    </div>
  );
}
