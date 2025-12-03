import { requireRole } from '@/lib/auth/requireRole';
import { getSectionPageData, LessonMeta } from '@/lib/learners/queries';
import { renderMarkdownForView } from '@/lib/learners/markdownView';
import ToastFromQuery from '@/components/ui/ToastFromQuery';
import { addTimeSpent } from './actions';
import SectionToc from '@/components/learners/SectionToc';
import LessonHeader from '@/components/learners/LessonHeader';
import SectionCompletionPanel from '@/components/learners/SectionCompletionPanel';
import SectionTocMobileDrawer from '@/components/learners/SectionTocMobileDrawer';
import Link from 'next/link';

export const preferredRegion = ['hnd1'];

export default async function SectionView({ params }: { params: { courseId: string; sectionId: string } }) {
  const { userId, profile } = await requireRole(['user']);
  const payload = await getSectionPageData(params.courseId, params.sectionId, userId);
  if (!payload) {
    return <div className="surface-card rounded-xl p-4 text-[color:var(--text)]">閲覧できません。</div>;
  }

  const { course, chapters, lessons, progress, section, content_md, limits } = payload;
  const html = await renderMarkdownForView(content_md || '');
  const sendTime = addTimeSpent.bind(null, params.courseId, params.sectionId);

  // Build progress map to mark completed items in the table of contents
  const progressList = (progress as Array<{ lesson_id: string; is_unlocked?: boolean; is_completed?: boolean }>) || [];
  const progressMap = new Map<string, { is_unlocked?: boolean; is_completed?: boolean }>();
  for (const p of progressList) progressMap.set(p.lesson_id, { is_unlocked: p.is_unlocked, is_completed: p.is_completed });

  // Organize lessons per chapter for the sidebar navigator
  const chapterList = chapters as Array<{ id: string; title: string; chapter_sort_key: number | null }>;
  const lessonList = lessons as LessonMeta[];
  const sectionsByChapter: Record<string, { id: string; title: string; section_sort_key: number; is_completed?: boolean }[]> = {};
  const completedSectionIds = new Set<string>();
  for (const ch of chapterList) sectionsByChapter[ch.id] = [];
  for (const lesson of lessonList) {
    const arr = sectionsByChapter[lesson.chapter_id] || (sectionsByChapter[lesson.chapter_id] = []);
    const isCompleted = Boolean(progressMap.get(lesson.id)?.is_completed);
    if (isCompleted) completedSectionIds.add(lesson.id);
    arr.push({
      id: lesson.id,
      title: lesson.title,
      section_sort_key: lesson.section_sort_key ?? 0,
      is_completed: isCompleted,
    });
  }
  for (const ch of chapterList) sectionsByChapter[ch.id].sort((a, b) => (a.section_sort_key ?? 0) - (b.section_sort_key ?? 0));

  // Determine navigation targets
  const ordered: { id: string; title: string }[] = [];
  for (const ch of chapterList) for (const item of sectionsByChapter[ch.id]) ordered.push({ id: item.id, title: item.title });
  const idx = ordered.findIndex((item) => item.id === params.sectionId);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  const sectionProgress = progressMap.get(params.sectionId);
  const isCompleted = Boolean(sectionProgress?.is_completed);
  if (isCompleted) completedSectionIds.add(params.sectionId);

  const limitIds = new Set((limits || []).map((limit) => limit.section_id));
  const limitIndexMap = new Map<string, number>();
  ordered.forEach((item, orderIndex) => {
    if (limitIds.has(item.id)) {
      limitIndexMap.set(item.id, orderIndex);
    }
  });
  let highestLimitReached = -1;
  ordered.forEach((item, orderIndex) => {
    if (!limitIds.has(item.id)) return;
    const prog = progressMap.get(item.id);
    if (prog?.is_completed || prog?.is_unlocked) {
      highestLimitReached = Math.max(highestLimitReached, orderIndex);
    }
  });
  if (!profile.interview_completed && idx >= 0) {
    for (const [, limitIndex] of limitIndexMap) {
      if (limitIndex <= idx) {
        highestLimitReached = Math.max(highestLimitReached, limitIndex);
      }
    }
    const currentLimitIndex = limitIndexMap.get(params.sectionId);
    if (typeof currentLimitIndex === 'number') {
      highestLimitReached = Math.max(highestLimitReached, currentLimitIndex);
    }
  }
  const lockedSections = new Set<string>();
  if (!profile.interview_completed && highestLimitReached >= 0) {
    for (let i = highestLimitReached + 1; i < ordered.length; i++) {
      lockedSections.add(ordered[i].id);
    }
  }
  const shouldBlock = lockedSections.has(params.sectionId);

  if (shouldBlock) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-[color:var(--surface-1)] p-6 text-center shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
        <h1 className="text-xl font-semibold text-[color:var(--text)]">この先の教材はまだ表示できません</h1>
        <p className="text-sm text-[color:var(--muted)]">
          この先の教材を閲覧するためには、LINEにて担当者に中間面談を実施する旨を伝えてください🙇
        </p>
        <Link
          href="/courses"
          className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand/90 focus-ring"
        >
          コース一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 lg:px-0">
      <ToastFromQuery />
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumbs" className="hidden text-sm text-[color:var(--muted)] sm:block">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/courses" className="rounded underline decoration-transparent transition hover:decoration-[color:var(--brand)] focus-ring">
              コース一覧
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href={`/courses/${params.courseId}`} className="rounded underline decoration-transparent transition hover:decoration-[color:var(--brand)] focus-ring">
              {course?.title || 'コース'}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="max-w-[60ch] truncate text-[color:var(--text)]">
            {section.title}
          </li>
        </ol>
      </nav>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-6">
          <LessonHeader
            courseId={params.courseId}
            sectionId={params.sectionId}
            title={section.title}
            durationMin={section.duration_min}
            initialCompleted={isCompleted}
          />
          <SectionTocMobileDrawer
            chapters={chapterList.map((c) => ({
              id: c.id,
              title: c.title,
              chapter_sort_key: c.chapter_sort_key ?? 0,
            }))}
            sectionsByChapter={sectionsByChapter}
            courseId={params.courseId}
            currentSectionId={params.sectionId}
            completedSectionIds={Array.from(completedSectionIds)}
            lockedSectionIds={Array.from(lockedSections)}
            initialInterviewCompleted={!!profile.interview_completed}
          />
          <div>
            <div className="border-t border-[color:var(--line)]" />
            <div className="mt-6 flex flex-col lg:grid lg:grid-cols-[minmax(0,120ch)_auto] lg:items-start lg:gap-8">
              <div className="rounded-[28px] border border-[color:var(--line)] bg-[color:var(--surface-1)]/60 p-6 shadow-[var(--shadow-1)]">
                <article
                  className="prose max-w-none flex-1 lg:max-w-[120ch] lg:pr-8 prose-headings:text-[#C2C6CC] prose-p:text-[#C2C6CC] prose-li:text-[#C2C6CC] prose-strong:text-[#C2C6CC] prose-em:text-[#C2C6CC] prose-code:text-[#C2C6CC]"
                  style={{ color: '#C2C6CC' }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
              <div className="mb-6 hidden shrink-0 lg:sticky lg:top-24 lg:block lg:w-72 lg:pl-4 xl:w-80 xl:pl-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] lg:block">コースメニュー</p>
                <SectionToc
                  chapters={chapterList.map((c) => ({ id: c.id, title: c.title, chapter_sort_key: c.chapter_sort_key ?? 0 }))}
                  sectionsByChapter={sectionsByChapter}
                  courseId={params.courseId}
                  currentSectionId={params.sectionId}
                  completedSectionIds={Array.from(completedSectionIds)}
                  lockedSectionIds={Array.from(lockedSections)}
                  initialInterviewCompleted={!!profile.interview_completed}
                />
              </div>
            </div>
          </div>
          <SectionCompletionPanel
            courseId={params.courseId}
            sectionId={params.sectionId}
            initialCompleted={isCompleted}
            prev={prev}
            next={next}
            nextLocked={Boolean(next && lockedSections.has(next.id))}
            locksAfterCompletion={!profile.interview_completed && limitIds.has(params.sectionId)}
            initialInterviewCompleted={!!profile.interview_completed}
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
