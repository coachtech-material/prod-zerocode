import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || !['staff', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [{ data: stu }, { data: courses }, { data: chapters }, { data: lessons }] = await Promise.all([
    supabase.rpc('ops_list_users_with_status'),
    supabase
      .from('courses')
      .select('id,title,sort_key,status')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('sort_key', { ascending: true }),
    supabase
      .from('chapters')
      .select('id,title,chapter_sort_key,course_id,status')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('course_id', { ascending: true })
      .order('chapter_sort_key', { ascending: true }),
    supabase
      .from('lessons')
      .select('id,title,section_sort_key,chapter_id,course_id,status')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('course_id', { ascending: true })
      .order('chapter_id', { ascending: true })
      .order('section_sort_key', { ascending: true }),
  ]);

  type StudentSummary = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    role: string;
    last_sign_in_at: string | null;
    inactive: boolean;
    phone: string | null;
    issued_at: string | null;
    login_disabled: boolean;
    ops_tagged: boolean;
    interview_completed: boolean;
  };

  const students: StudentSummary[] =
    (stu || []).map((r: any) => ({
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
      ops_tagged: !!r.ops_tagged,
      interview_completed: !!r.interview_completed,
    })) ?? [];

  const studentIds = students.map((student) => student.id);

  const { data: progressRows } = studentIds.length
    ? await supabase
        .from('progress')
        .select('user_id,lesson_id,is_completed')
        .in('user_id', studentIds)
    : { data: [] };

  type SectionMeta = {
    id: string;
    title: string;
    section_sort_key: number;
    chapter_sort_key: number;
    chapterTitle: string;
    course_sort_key: number;
    courseTitle: string;
  };

  const courseMap = new Map<string, { title: string; sort_key: number }>(
    (courses || []).map((course: any) => [
      course.id as string,
      { title: (course.title as string) ?? 'コース', sort_key: (course.sort_key as number) ?? 0 },
    ])
  );

  const chapterMap = new Map<string, { title: string; course_id: string | null; chapter_sort_key: number }>(
    (chapters || []).map((chapter: any) => [
      chapter.id as string,
      {
        title: (chapter.title as string) ?? 'チャプター',
        course_id: (chapter.course_id as string) ?? null,
        chapter_sort_key: (chapter.chapter_sort_key as number) ?? 0,
      },
    ])
  );

  const sectionColumns = (lessons || [])
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
        course_sort_key: course.sort_key,
        courseTitle: course.title,
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
  (Array.isArray(progressRows) ? progressRows : []).forEach((row: any) => {
    if (!row.is_completed) return;
    const userId = row.user_id as string | undefined;
    const lessonId = row.lesson_id as string | undefined;
    if (!userId || !lessonId) return;
    if (!progressByUser[userId]) progressByUser[userId] = [];
    progressByUser[userId].push(lessonId);
  });

  const users = students.map((student) => ({
    ...student,
    completedSections: progressByUser[student.id] ?? [],
  }));

  return NextResponse.json({ sections: sectionColumns, users });
}
