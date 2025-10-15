import Image from 'next/image';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { requireRole } from '@/lib/auth/requireRole';
import { getAllPublishedCoursesWithTotals } from '@/lib/learners/queries';
import { mdToSafeHtml } from '@/lib/markdown';

export default async function LearnerCoursesPage() {
  await requireRole(['user']);
  const courses = await getAllPublishedCoursesWithTotals();

  // Helper: convert markdown to plain summary text (sanitized), max ~180 chars
  function decodeEntities(s: string) {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  async function toSummary(md: string): Promise<string> {
    const html = await mdToSafeHtml(md || '');
    const text = decodeEntities(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
    const limit = 180;
    return text.length > limit ? text.slice(0, limit - 1) + '…' : text;
  }

  // Precompute summaries server-side
  const courseList = (courses as any[]) || [];
  const summaries = new Map<string, string>();
  await Promise.all(
    courseList.map(async (c) => {
      summaries.set(c.id, await toSummary(c.description_md || ''));
    }),
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">公開コース</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courseList.map((c, index) => {
          const descId = `desc-${c.id}`;
          const summary = summaries.get(c.id) || '';
          const thumbUrl = c.thumbnail_url as string | null;
          const isFirstCard = index === 0;
          return (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="surface-card block rounded-2xl transition hover:bg-[color:var(--surface-1)]/80 focus-ring"
              aria-describedby={descId}
            >
              {/* Thumbnail with 16:9 aspect ratio */}
              <div className="relative w-full overflow-hidden rounded-t-2xl" style={{ paddingTop: '56.25%' }}>
                {thumbUrl ? (
                  <Image
                    src={thumbUrl}
                    alt={`${c.title} のサムネイル`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    priority={isFirstCard}
                    fetchPriority={isFirstCard ? 'high' : 'auto'}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center rounded-t-2xl bg-brand-sky/10 text-4xl font-semibold text-brand/60">
                    {(String(c.title || '').trim()[0] || '?').toUpperCase()}
                  </div>
                )}
              </div>

              {/* Text area */}
              <div className="p-4">
                <div className="text-lg font-semibold text-[color:var(--text)]" title={c.title}>{c.title}</div>
                <p id={descId} className="mt-1 text-sm text-[color:var(--muted)]" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {summary}
                </p>
                <div className="mt-3 flex items-center justify-end gap-2 text-xs text-[color:var(--muted)]">
                  <Clock className="h-4 w-4 opacity-80" />
                  <span>合計 {Number(c.total_minutes || 0)} 分</span>
                </div>
              </div>
            </Link>
          );
        })}

        {!courseList.length && (
          <div className="text-[color:var(--muted)]">公開中のコースはありません</div>
        )}
      </div>
    </div>
  );
}
