import { createServerSupabaseClient } from '@/lib/supabase/server';

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

export async function getCourseTree(courseId: string) {
  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id,title,description_md,thumbnail_url,overview_video_url')
    .eq('id', courseId)
    .eq('status', 'published')
    .single();
  if (!course) return null;

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id,title,chapter_sort_key')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('chapter_sort_key');

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id,title,chapter_id,section_sort_key,status,duration_min')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('chapter_id')
    .order('section_sort_key');

  const { data: progress } = await supabase
    .from('progress')
    .select('lesson_id,is_unlocked,is_completed')
    .eq('course_id', courseId);

  return { course, chapters: chapters || [], lessons: lessons || [], progress: progress || [] };
}

export async function getSectionWithGate(courseId: string, sectionId: string) {
  const supabase = createServerSupabaseClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id,title,chapter_id,course_id,duration_min,section_sort_key')
    .eq('id', sectionId)
    .eq('course_id', courseId)
    .eq('status', 'published')
    .single();
  if (!lesson) return null;
  const { data: progress } = await supabase
    .from('progress')
    .select('is_unlocked,is_completed')
    .eq('course_id', courseId)
    .eq('lesson_id', sectionId)
    .single();

  // Ignore lock: always fetch content and treat as unlocked
  const { data } = await supabase
    .from('lessons')
    .select('content_md')
    .eq('id', sectionId)
    .single();
  const content_md = (data as any)?.content_md || '';
  const unlocked = true;
  return { lesson, progress, unlocked, content_md };
}
