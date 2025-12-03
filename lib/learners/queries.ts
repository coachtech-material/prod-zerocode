import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type LessonMeta = {
  id: string;
  title: string;
  chapter_id: string;
  course_id: string;
  duration_min: number | null;
  section_sort_key: number | null;
};

export type SectionPageData = {
  course: Record<string, any>;
  chapters: Array<Record<string, any>>;
  lessons: Array<Record<string, any>>;
  progress: Array<Record<string, any>>;
  section: LessonMeta;
  content_md: string;
  limits: Array<{ section_id: string }>;
};

export async function getAllPublishedCoursesWithTotals() {
  const supabase = createServerSupabaseClient();
  const { data: courses } = await supabase
    .from('courses')
    .select('id,title,description_md,thumbnail_url,sort_key')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('sort_key', { ascending: true })
    .order('title', { ascending: true });
  const list = (courses || []) as any[];
  if (!list.length) return [] as any[];

  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('course_id,duration_min')
    .in('course_id', list.map((c) => c.id))
    .eq('status', 'published')
    .is('deleted_at', null);

  const totals = new Map<string, number>();
  for (const row of (lessonRows || []) as any[]) {
    const key = row.course_id as string;
    const v = Number(row.duration_min || 0);
    totals.set(key, (totals.get(key) || 0) + (isFinite(v) ? v : 0));
  }
  return list.map((c) => ({ ...c, total_minutes: totals.get(c.id) || 0 }));
}

export async function getCourseTree(courseId: string, userId: string, client?: SupabaseClient) {
  const supabase = client ?? createServerSupabaseClient();
  const [
    { data: course },
    { data: chapters },
    { data: lessons },
    { data: progress },
    { data: limits },
  ] = await Promise.all([
    supabase
      .from('courses')
      .select('id,title,description_md,thumbnail_url,overview_video_url')
      .eq('id', courseId)
      .eq('status', 'published')
      .single(),
    supabase
      .from('chapters')
      .select('id,title,chapter_sort_key')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('chapter_sort_key'),
    supabase
      .from('lessons')
      .select('id,title,chapter_id,section_sort_key,status,duration_min')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('chapter_id')
      .order('section_sort_key'),
    supabase
      .from('progress')
      .select('lesson_id,is_unlocked,is_completed')
      .eq('course_id', courseId)
      .eq('user_id', userId),
    supabase
      .from('progress_limits')
      .select('section_id')
      .eq('course_id', courseId),
  ]);
  if (!course) return null;

  return { course, chapters: chapters || [], lessons: lessons || [], progress: progress || [], limits: limits || [] };
}

export async function getSectionPageData(
  courseId: string,
  sectionId: string,
  userId: string,
  client?: SupabaseClient
): Promise<SectionPageData | null> {
  const supabase = client ?? createServerSupabaseClient();

  const [
    { data: course },
    { data: chapters },
    { data: lessons },
    { data: progress },
    { data: sectionDetail },
    { data: limits },
  ] = await Promise.all([
    supabase
      .from('courses')
      .select('id,title,description_md,thumbnail_url,overview_video_url')
      .eq('id', courseId)
      .eq('status', 'published')
      .single(),
    supabase
      .from('chapters')
      .select('id,title,chapter_sort_key')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('chapter_sort_key'),
    supabase
      .from('lessons')
      .select('id,title,chapter_id,section_sort_key,status,duration_min')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('chapter_id')
      .order('section_sort_key'),
    supabase
      .from('progress')
      .select('lesson_id,is_unlocked,is_completed,time_spent_sec')
      .eq('course_id', courseId)
      .eq('user_id', userId),
    supabase
      .from('lessons')
      .select('id,title,chapter_id,course_id,duration_min,section_sort_key,content_md')
      .eq('id', sectionId)
      .eq('course_id', courseId)
      .eq('status', 'published')
      .maybeSingle(),
    supabase.from('progress_limits').select('section_id').eq('course_id', courseId),
  ]);

  if (!course || !sectionDetail) return null;

  const { content_md, ...section } = sectionDetail as LessonMeta & { content_md?: string | null };

  return {
    course: (course || {}) as Record<string, any>,
    chapters: (chapters || []) as Array<Record<string, any>>,
    lessons: (lessons || []) as Array<Record<string, any>>,
    progress: (progress || []) as Array<Record<string, any>>,
    section,
    content_md: content_md || '',
    limits: (limits || []) as Array<{ section_id: string }>,
  };
}
