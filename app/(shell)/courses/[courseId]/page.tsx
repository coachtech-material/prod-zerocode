import { requireRole } from '@/lib/auth/requireRole';
import { getCourseTree } from '@/lib/learners/queries';
import { renderMarkdownForView } from '@/lib/learners/markdownView';
import Link from 'next/link';
import ToastFromQuery from '@/components/ui/ToastFromQuery';
import CourseContentList from '@/components/learners/CourseContentList';

export const preferredRegion = ['hnd1'];

export default async function CourseDetailLearner({ params, searchParams }: { params: { courseId: string }, searchParams?: Record<string,string|undefined> }) {
  const { userId, profile } = await requireRole(['user']);
  const data = await getCourseTree(params.courseId, userId);
  const course = data?.course as any | undefined;
  const chapters = (data?.chapters as any[]) || [];
  const lessons = (data?.lessons as any[]) || [];
  const progress = (data?.progress as any[]) || [];
  const limits = (data?.limits as any[]) || [];

  const html = course ? await renderMarkdownForView(course.description_md || '') : '';

  const secsByChapter = new Map<string, any[]>();
  const progressMap = new Map<string, any>();
  for (const p of progress) progressMap.set(p.lesson_id, p);
  const chapterOrderMap = new Map(chapters.map((c: any) => [c.id as string, c.chapter_sort_key ?? 0]));
  const sortedLessons = lessons.slice().sort((a: any, b: any) => {
    const ca = chapterOrderMap.get(a.chapter_id) ?? 0;
    const cb = chapterOrderMap.get(b.chapter_id) ?? 0;
    if (ca !== cb) return ca - cb;
    return (a.section_sort_key ?? 0) - (b.section_sort_key ?? 0);
  });
  for (const l of sortedLessons) {
    if (!secsByChapter.has(l.chapter_id)) secsByChapter.set(l.chapter_id, []);
    const pr = progressMap.get(l.id) || {};
    secsByChapter.get(l.chapter_id)!.push({ ...l, is_unlocked: pr.is_unlocked, is_completed: pr.is_completed });
  }
  const limitIds = new Set((limits || []).map((limit: any) => limit.section_id as string));
  const limitIndexMap = new Map<string, number>();
  sortedLessons.forEach((lesson: any, index: number) => {
    if (limitIds.has(lesson.id as string)) {
      limitIndexMap.set(lesson.id as string, index);
    }
  });
  let highestLimitReached = -1;
  sortedLessons.forEach((lesson: any, index: number) => {
    if (!limitIds.has(lesson.id as string)) return;
    const progressEntry = progressMap.get(lesson.id);
    if (progressEntry?.is_completed || progressEntry?.is_unlocked) {
      highestLimitReached = Math.max(highestLimitReached, index);
    }
  });
  if (!profile.interview_completed) {
    const currentProgressIndex = sortedLessons.findIndex((lesson: any) => progressMap.get(lesson.id)?.is_unlocked || progressMap.get(lesson.id)?.is_completed);
    const maxUnlockedIndex = currentProgressIndex;
    if (maxUnlockedIndex >= 0) {
      for (const [, limitIndex] of limitIndexMap) {
        if (limitIndex <= maxUnlockedIndex) {
          highestLimitReached = Math.max(highestLimitReached, limitIndex);
        }
      }
    }
  }
  const lockedSections = new Set<string>();
  if (!profile.interview_completed && highestLimitReached >= 0) {
    for (let i = highestLimitReached + 1; i < sortedLessons.length; i++) {
      lockedSections.add(sortedLessons[i].id as string);
    }
  }

  return (
    <div className="space-y-6">
      <ToastFromQuery />
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumbs" className="text-sm text-[color:var(--muted)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/courses" className="rounded underline decoration-transparent transition hover:decoration-[color:var(--brand)] focus-ring">
              コース一覧
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="max-w-[60ch] truncate text-[color:var(--text)]">
            {course?.title || 'コース'}
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-[color:var(--text)]">{course?.title || 'コース'}</h1>
      
      {/* Overview video between title and description */}
      {course?.overview_video_url && (
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)] p-2 shadow-[var(--shadow-1)]">
          <div className="aspect-video overflow-hidden rounded-xl">
            {(() => {
              try {
                const u = new URL(String(course.overview_video_url));
                const host = u.hostname;
                // YouTube embed support
                if (host.includes('youtube.com') || host.includes('youtu.be')) {
                  let id = '';
                  if (host.includes('youtube.com')) id = u.searchParams.get('v') || '';
                  if (!id && host.includes('youtu.be')) id = u.pathname.slice(1);
                  if (id) {
                    const src = `https://www.youtube.com/embed/${id}`;
                    return (
                      <iframe
                        src={src}
                        title="コース概要動画"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    );
                  }
                }
                // Fallback: direct video file (e.g., mp4)
                return (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video controls preload="metadata" className="h-full w-full">
                    <source src={String(course.overview_video_url)} />
                  </video>
                );
              } catch {
                return null;
              }
            })()}
          </div>
        </div>
      )}
      {course && (
        <article className="prose max-w-none text-[color:var(--text)]" dangerouslySetInnerHTML={{ __html: html }} />
      )}

      <div className="surface-card rounded-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-3">
          <h2 className="font-medium text-[color:var(--text)]">コンテンツ</h2>
        </div>
        <CourseContentList
          chapters={chapters.map((c:any)=>({ id: c.id, title: c.title, chapter_sort_key: c.chapter_sort_key }))}
          sectionsByChapter={Object.fromEntries(chapters.map((c:any)=>[c.id, (secsByChapter.get(c.id)||[])]))}
          courseId={params.courseId}
          lockedSectionIds={Array.from(lockedSections)}
          initialInterviewCompleted={!!profile.interview_completed}
        />
      </div>
    </div>
  );
}
