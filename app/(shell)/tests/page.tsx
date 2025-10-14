import Link from 'next/link';

export default function TestsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">テスト管理</h1>
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-4 space-y-3">
        <p className="text-sm text-slate-600">確認テスト（学習者実行）を開く：</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/test/confirm?test_id=demo-cli" className="rounded-lg bg-brand-sky/10 px-3 py-1 hover:bg-brand-sky/20 focus-ring">CLIデモ</Link>
          <Link href="/test/confirm?test_id=demo-db" className="rounded-lg bg-brand-sky/10 px-3 py-1 hover:bg-brand-sky/20 focus-ring">DBデモ</Link>
        </div>
        <p className="text-xs text-slate-500">注: 現在は学習者用確認テストのデモのみ提供。テスト定義はコード内の `lib/tests/specs.ts` にて読み取り専用で管理しています。</p>
      </div>
    </div>
  );
}
