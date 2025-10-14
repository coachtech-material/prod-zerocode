import { requireRole } from '@/lib/auth/requireRole';
import { getSectionWithGate, getCourseTree } from '@/lib/learners/queries';
import { renderMarkdownForView } from '@/lib/learners/markdownView';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ToastFromQuery from '@/components/ui/ToastFromQuery';
import { addTimeSpent } from './actions';
import SectionToc from '@/components/learners/SectionToc';
import LessonHeader from '@/components/learners/LessonHeader';
import SectionCompletionPanel from '@/components/learners/SectionCompletionPanel';

export default async function SectionView({ params }: { params: { courseId: string; sectionId: string } }) {
  await requireRole(['user']);
  const data = await getSectionWithGate(params.courseId, params.sectionId);
  if (!data) return <div className="rounded-xl border border-brand-sky/20 bg-white p-4">閲覧できません。</div>;
  const { lesson, progress, unlocked, content_md } = data;
  const html = unlocked ? await renderMarkdownForView(content_md || '') : '<p class="text-slate-500">このセクションはまだ閲覧できません。</p>';

  // Fetch course basic info for breadcrumbs
  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id,title')
    .eq('id', params.courseId)
    .single();

  const sendTime = addTimeSpent.bind(null, params.courseId, params.sectionId);

  // Build table of contents and prev/next from course tree
  const tree = await getCourseTree(params.courseId);
  const chapters = (tree?.chapters as any[]) || [];
  const lessons = (tree?.lessons as any[]) || [];
  const progressList = (tree?.progress as any[]) || [];
  const progressMap = new Map<string, { is_unlocked?: boolean; is_completed?: boolean }>();
  for (const p of progressList) progressMap.set(p.lesson_id, { is_unlocked: p.is_unlocked, is_completed: p.is_completed });

  const sectionsByChapter: Record<string, { id: string; title: string; section_sort_key: number; is_completed?: boolean }[]> = {};
  const completedSectionIds = new Set<string>();
  for (const ch of chapters) sectionsByChapter[ch.id] = [];
  for (const s of lessons) {
    const arr = sectionsByChapter[s.chapter_id] || (sectionsByChapter[s.chapter_id] = []);
    const isCompleted = Boolean(progressMap.get(s.id)?.is_completed);
    if (isCompleted) completedSectionIds.add(s.id);
    arr.push({ id: s.id, title: s.title, section_sort_key: s.section_sort_key, is_completed: isCompleted });
  }
  for (const ch of chapters) sectionsByChapter[ch.id].sort((a,b)=> (a.section_sort_key??0) - (b.section_sort_key??0));
  const ordered: { id: string; title: string }[] = [];
  for (const ch of chapters) for (const s of sectionsByChapter[ch.id]) ordered.push({ id: s.id, title: s.title });
  const idx = ordered.findIndex((s) => s.id === params.sectionId);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  const isCompleted = Boolean(progress?.is_completed);
  if (isCompleted) {
    completedSectionIds.add(params.sectionId);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 lg:px-0">
      <ToastFromQuery />
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumbs" className="text-sm text-slate-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/courses" className="underline decoration-white/20 hover:decoration-white focus-ring rounded">
              コース一覧
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href={`/courses/${params.courseId}`} className="underline decoration-white/20 hover:decoration-white focus-ring rounded">
              {course?.title || 'コース'}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-slate-700 truncate max-w-[60ch]">
            {lesson.title}
          </li>
        </ol>
      </nav>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-6">
          <LessonHeader
            courseId={params.courseId}
            sectionId={params.sectionId}
            title={lesson.title}
            durationMin={lesson.duration_min}
            initialCompleted={isCompleted}
          />
          <div>
            <div className="border-t border-brand-sky/20" />
            <div className="mt-6 flex flex-col lg:grid lg:grid-cols-[minmax(0,120ch)_auto] lg:items-start lg:gap-8">
              <article
                className="prose max-w-none dark:prose flex-1 lg:max-w-[120ch] lg:pr-8"
                dangerouslySetInnerHTML={{ __html: html }}
              />
              <div className="mb-6 lg:mb-0 lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-24 lg:pl-4 xl:pl-6">
                <p className="mb-4 hidden text-xs font-semibold uppercase tracking-wide text-brand lg:block">コースメニュー</p>
                <SectionToc
                  chapters={chapters.map((c:any)=>({ id: c.id, title: c.title, chapter_sort_key: c.chapter_sort_key }))}
                  sectionsByChapter={sectionsByChapter}
                  courseId={params.courseId}
                  currentSectionId={params.sectionId}
                  completedSectionIds={Array.from(completedSectionIds)}
                />
                <Link
                  href={`/courses/${params.courseId}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-brand-yellow px-3 py-2 text-sm text-brand font-medium focus-ring hover:bg-brand-yellow/90 lg:hidden"
                >
                  ← コースに戻る
                </Link>
              </div>
            </div>
          </div>
          <SectionCompletionPanel
            courseId={params.courseId}
            sectionId={params.sectionId}
            initialCompleted={isCompleted}
            prev={prev}
            next={next}
          />
        </div>
      </div>
      {/* Time tracker: fire-and-forget */}
      <TimeTracker action={sendTime} />
    </div>
  );
}

function TimeTracker({ action }: { action: (formData: FormData) => Promise<void> }) {
  'use client';
  // Post every 30s of visible time
  let acc = 0;
  let t: any;
  const tick = () => { acc += 1; if (acc % 30 === 0) { const fd = new FormData(); fd.set('sec', String(30)); action(fd); } t = setTimeout(tick, 1000); };
  if (typeof window !== 'undefined') {
    if (!t) t = setTimeout(tick, 1000);
    window.addEventListener('beforeunload', () => {
      if (acc > 0) { const fd = new FormData(); fd.set('sec', String(acc)); action(fd); }
    });
  }
  return null;
}
