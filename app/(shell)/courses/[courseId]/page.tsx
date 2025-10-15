import { requireRole } from '@/lib/auth/requireRole';
import { getCourseTree } from '@/lib/learners/queries';
import { renderMarkdownForView } from '@/lib/learners/markdownView';
import Link from 'next/link';
import ToastFromQuery from '@/components/ui/ToastFromQuery';
import CourseContentList from '@/components/learners/CourseContentList';

export default async function CourseDetailLearner({ params, searchParams }: { params: { courseId: string }, searchParams?: Record<string,string|undefined> }) {
  await requireRole(['user']);
  const data = await getCourseTree(params.courseId);
  const course = data?.course as any | undefined;
  const chapters = (data?.chapters as any[]) || [];
  const lessons = (data?.lessons as any[]) || [];
  const progress = (data?.progress as any[]) || [];

  const html = course ? await renderMarkdownForView(course.description_md || '') : '';

  const secsByChapter = new Map<string, any[]>();
  const progressMap = new Map<string, any>();
  for (const p of progress) progressMap.set(p.lesson_id, p);
  for (const l of lessons) {
    if (!secsByChapter.has(l.chapter_id)) secsByChapter.set(l.chapter_id, []);
    const pr = progressMap.get(l.id) || {};
    secsByChapter.get(l.chapter_id)!.push({ ...l, is_unlocked: pr.is_unlocked, is_completed: pr.is_completed });
  }

  return (
    <div className="space-y-6">
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
          <li aria-current="page" className="text-slate-700 truncate max-w-[60ch]">
            {course?.title || 'コース'}
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold">{course?.title || 'コース'}</h1>
      
      {/* Overview video between title and description */}
      {course?.overview_video_url && (
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-brand-sky/20 bg-white p-2">
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
        <article className="prose max-w-none dark:prose" dangerouslySetInnerHTML={{ __html: html }} />
      )}

      <div className="rounded-2xl border border-brand-sky/20 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-medium">コンテンツ</h2>
        </div>
        <CourseContentList
          chapters={chapters.map((c:any)=>({ id: c.id, title: c.title, chapter_sort_key: c.chapter_sort_key }))}
          sectionsByChapter={Object.fromEntries(chapters.map((c:any)=>[c.id, (secsByChapter.get(c.id)||[])]))}
          courseId={params.courseId}
        />
      </div>
    </div>
  );
}
