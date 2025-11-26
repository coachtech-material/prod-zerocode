import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/service';

const EXPORT_TOKEN = process.env.ADMIN_STUDENTS_EXPORT_TOKEN;

export async function GET(req: NextRequest) {
  if (!EXPORT_TOKEN) {
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  const providedToken =
    req.headers.get('x-export-token') ?? req.nextUrl.searchParams.get('token') ?? '';

  if (providedToken !== EXPORT_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseAdminClient();

  const [studentsRes, coursesRes, chaptersRes, lessonsRes] = await Promise.all([
    supabase.rpc('ops_export_users'),
    supabase
      .from('courses')
      .select('id,title,sort_key,status,deleted_at')
      .order('sort_key', { ascending: true }),
    supabase
      .from('chapters')
      .select('id,title,chapter_sort_key,course_id,status,deleted_at')
      .order('course_id', { ascending: true })
      .order('chapter_sort_key', { ascending: true }),
    supabase
      .from('lessons')
      .select('id,title,section_sort_key,chapter_id,course_id,status,deleted_at')
      .order('course_id', { ascending: true })
      .order('chapter_id', { ascending: true })
      .order('section_sort_key', { ascending: true }),
  ]);

  if (studentsRes.error) {
    return NextResponse.json({ error: studentsRes.error.message }, { status: 500 });
  }

  const students = (studentsRes.data || []).map((r: any) => ({
    id: r.id as string,
    first_name: (r.first_name as string | null) ?? null,
    last_name: (r.last_name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    role: 'user',
    last_sign_in_at: (r.last_sign_in_at as string | null) ?? null,
    inactive: !!r.inactive,
    phone: (r.phone as string | null) ?? null,
    issued_at: (r.issued_at as string | null) ?? null,
    login_disabled: !!r.login_disabled,
  }));

  const studentIds = students.map((student: { id: string }) => student.id);

  const progressRes = await (studentIds.length
    ? supabase
        .from('progress')
        .select('user_id,lesson_id,is_completed')
        .in('user_id', studentIds)
    : Promise.resolve({ data: [], error: null }));

  if (progressRes.error) {
    return NextResponse.json({ error: progressRes.error.message }, { status: 500 });
  }

  const courseMap = new Map<string, { title: string; sort_key: number }>(
    (coursesRes.data || [])
      .filter((course: any) => !course.deleted_at && course.status === 'published')
      .map((course: any) => [course.id as string, { title: course.title as string, sort_key: course.sort_key as number }])
  );

  const chapterMap = new Map<string, { title: string; course_id: string | null; chapter_sort_key: number }>(
    (chaptersRes.data || [])
      .filter((chapter: any) => !chapter.deleted_at && chapter.status === 'published')
      .map((chapter: any) => [
        chapter.id as string,
        {
          title: chapter.title as string,
          course_id: (chapter.course_id as string | null) ?? null,
          chapter_sort_key: (chapter.chapter_sort_key as number) ?? 0,
        },
      ])
  );

  type SectionMeta = {
    id: string;
    title: string;
    section_sort_key: number;
    chapter_sort_key: number;
    chapterTitle: string;
    course_sort_key: number;
    courseTitle: string;
  };

  const sections = (lessonsRes.data || [])
    .filter((lesson: any) => !lesson.deleted_at && lesson.status === 'published')
    .map<SectionMeta | null>((lesson: any) => {
      const chapter = lesson.chapter_id ? chapterMap.get(lesson.chapter_id as string) : null;
      const courseFromChapter = chapter?.course_id ? courseMap.get(chapter.course_id) : undefined;
      const course = courseFromChapter || (lesson.course_id ? courseMap.get(lesson.course_id as string) : undefined);
      if (!course) return null;
      return {
        id: lesson.id as string,
        title: (lesson.title as string) ?? 'セクション',
        section_sort_key: (lesson.section_sort_key as number) ?? 0,
        chapter_sort_key: chapter?.chapter_sort_key ?? 0,
        chapterTitle: chapter?.title ?? 'チャプター',
        course_sort_key: course?.sort_key ?? 0,
        courseTitle: course?.title ?? 'コース',
      };
    })
    .filter((section): section is SectionMeta => section !== null)
    .sort((a, b) => {
      if (a.course_sort_key !== b.course_sort_key) return a.course_sort_key - b.course_sort_key;
      if (a.chapter_sort_key !== b.chapter_sort_key) return a.chapter_sort_key - b.chapter_sort_key;
      return a.section_sort_key - b.section_sort_key;
    })
    .map((section) => ({
      id: section.id,
      label: `${section.courseTitle} / ${section.chapterTitle} / ${section.title}`,
    }));

  const progressByUser: Record<string, string[]> = {};
  (progressRes.data || []).forEach((row: any) => {
    if (!row.is_completed) return;
    const userId = row.user_id as string | undefined;
    const lessonId = row.lesson_id as string | undefined;
    if (!userId || !lessonId) return;
    if (!progressByUser[userId]) progressByUser[userId] = [];
    progressByUser[userId].push(lessonId);
  });

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    students,
    sections,
    progressByUser,
  });
}
