import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TestPage() {
  const supabase = createServerSupabaseClient();
  // 確認テストの総数（公開のみ）
  let confirmTotal = 0;
  try {
    const { count } = await supabase
      .from('tests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('deleted_at', null);
    confirmTotal = count || 0;
  } catch {}
  // 進捗（着手）は未保存仕様のため 0 とする
  const confirmStarted = 0;
  const confirmPct = confirmTotal > 0 ? Math.round((confirmStarted / confirmTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">テスト</h1>

      <div className="space-y-4">
        {/* 確認テスト */}
        <Link href="/test/comfirm" className="block rounded-2xl border border-brand-sky/20 bg-white p-4 hover:bg-brand-sky/10 focus-ring">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">確認テスト一覧</h2>
            <span className="text-xs text-slate-600">{confirmStarted} / {confirmTotal}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">各ユニットの理解度を確認する短いテストです。</p>
          <ProgressBar percent={confirmPct} />
        </Link>
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const p = Math.min(100, Math.max(0, percent || 0));
  return (
    <div className="mt-3">
      <div className="h-2 w-full rounded-full bg-brand-sky/10">
        <div className="h-2 rounded-full bg-brand-yellow" style={{ width: `${p}%` }} />
      </div>
      <div className="mt-1 text-right text-[10px] text-slate-500">{p}%</div>
    </div>
  );
}
