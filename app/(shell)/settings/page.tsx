import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">設定</h1>
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-6 text-slate-600">
        <div className="grid gap-3">
          <div>各種設定の管理ページです。以下からプロフィール情報の更新に進めます。</div>
          <div>
            <Link href="/settings/profile" className="rounded-xl bg-brand-sky/10 px-4 py-2 focus-ring inline-block">プロフィール情報へ</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
