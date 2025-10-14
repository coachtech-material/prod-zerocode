import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import StudentTestPreview from '@/components/admin/TestStudentPreview';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function UserTestDetailPage({ params }: { params: { testId: string } }) {
  await requireRole(['user']);
  const supabase = createServerSupabaseClient();
  const { data: test } = await supabase
    .from('tests')
    .select('id,title,mode,spec_yaml,status')
    .eq('id', params.testId)
    .maybeSingle();

  if (!test || test.status !== 'published' || !test.mode) {
    return (
      <div className="space-y-4">
        <nav aria-label="breadcrumbs" className="text-sm text-slate-500">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/test/comfirm" className="underline decoration-white/20 hover:decoration-white focus-ring rounded">確認テスト</Link>
            </li>
            <li aria-hidden>›</li>
            <li className="text-slate-600">見つかりません</li>
          </ol>
        </nav>
        <div className="text-sm text-slate-500">このテストは存在しないか、公開されていません。</div>
      </div>
    );
  }

  const ModeBadge = ({ mode }: { mode: string }) => (
    <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[11px] leading-4 text-indigo-700">
      {mode === 'fill_blank'
        ? '穴埋め'
        : mode === 'semantic_fill'
        ? '言語化穴埋め'
        : mode === 'fix'
        ? '修正'
        : mode === 'reorder'
        ? '並べ替え'
        : '未設定'}
    </span>
  );

  return (
    <div className="space-y-4">
      <nav aria-label="breadcrumbs" className="text-sm text-slate-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/test/comfirm" className="underline decoration-white/20 hover:decoration-white focus-ring rounded">確認テスト</Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-slate-700 truncate max-w-[60ch]">{test.title || 'テスト'}</li>
        </ol>
      </nav>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{test.title || 'テスト'}</h1>
        <ModeBadge mode={test.mode} />
      </header>
      <section className="rounded-2xl border border-brand-sky/20 bg-white p-3">
        <StudentTestPreview mode={test.mode} initialSpec={test.spec_yaml} />
      </section>
    </div>
  );
}
