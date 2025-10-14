import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ChapterTestRunner from '@/components/learners/ChapterTestRunner';

export const dynamic = 'force-dynamic';

export default async function ChapterConfirmPage({ params, searchParams }: { params: { chapterId: string }, searchParams?: Record<string, string> }) {
  await requireRole(['user']);
  const supabase = createServerSupabaseClient();
  const chapterId = params.chapterId;

  const [{ data: chapter }, { data: tests }] = await Promise.all([
    supabase.from('chapters').select('id,title,course_id').eq('id', chapterId).maybeSingle(),
    supabase
      .from('tests')
      .select('id,title,mode,spec_yaml,status,course_id,chapter_id,created_at')
      .eq('status', 'published')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: true }),
  ]);

  const startIndex = searchParams?.i ? Math.max(0, parseInt(String(searchParams.i), 10) || 0) : 0;

  return (
    <div className="space-y-4">
      <nav aria-label="breadcrumbs" className="text-sm text-slate-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/test/comfirm" className="underline decoration-white/20 hover:decoration-white focus-ring rounded">確認テスト</Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-slate-700 truncate max-w-[60ch]">{chapter?.title || 'チャプター'}</li>
        </ol>
      </nav>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{chapter?.title || 'チャプター'}</h1>
      </header>

      <ChapterTestRunner tests={(tests || []).filter((t:any)=>!!t.mode)} startIndex={startIndex} />
    </div>
  );
}
