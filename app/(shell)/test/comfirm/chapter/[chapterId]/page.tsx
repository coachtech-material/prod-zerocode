import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ChapterTestRunner from '@/components/learners/ChapterTestRunner';

export const dynamic = 'force-dynamic';

export default async function ChapterConfirmPage({ params, searchParams }: { params: { chapterId: string }, searchParams?: Record<string, string> }) {
  await requireRole(['user']);
  const supabase = createServerSupabaseClient();
  const chapterId = params.chapterId;

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id,title,course_id,chapter_sort_key')
    .eq('id', chapterId)
    .maybeSingle();
  const [{ data: tests }, { data: siblingChapters }] = await Promise.all([
    supabase
      .from('tests')
      .select('id,title,mode,spec_yaml,status,course_id,chapter_id,created_at')
      .eq('status', 'published')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: true }),
    chapter?.course_id
      ? supabase
          .from('chapters')
          .select('id,title,chapter_sort_key')
          .eq('course_id', chapter.course_id)
          .is('deleted_at', null)
          .order('chapter_sort_key', { ascending: true })
      : Promise.resolve({ data: [] } as { data: any[] | null }),
  ]);

  const startIndex = searchParams?.i ? Math.max(0, parseInt(String(searchParams.i), 10) || 0) : 0;
  const orderedChapters = siblingChapters || [];
  const currentIndex = orderedChapters.findIndex((ch) => ch.id === chapterId);
  const nextChapter =
    currentIndex >= 0 && currentIndex + 1 < orderedChapters.length
      ? orderedChapters[currentIndex + 1]
      : null;

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

      <ChapterTestRunner
        tests={(tests || []).filter((t:any)=>!!t.mode)}
        startIndex={startIndex}
        chapterTitle={chapter?.title || 'チャプター'}
        nextChapter={nextChapter ? { id: nextChapter.id, title: nextChapter.title || '次のチャプター' } : null}
      />
    </div>
  );
}
