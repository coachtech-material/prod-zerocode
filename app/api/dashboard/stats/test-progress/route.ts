import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const testsResult = await supabase
      .from('tests')
      .select('id,chapter_id,course_id,mode,status,deleted_at');
    const testsData = testsResult.data ?? [];
    if (testsResult.error) {
      console.warn('test-progress: tests fetch error', testsResult.error);
    }

    const rawTests = (testsData || []).filter((test: any) => {
      if (!test) return false;
      if (test.status !== 'published') return false;
      if (test.deleted_at) return false;
      if (!test.mode) return false;
      return true;
    });

    const chapterIds = Array.from(
      new Set(
        rawTests
          .map((test: any) => test.chapter_id)
          .filter((value: any): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const courseIds = Array.from(
      new Set(
        rawTests
          .map((test: any) => test.course_id)
          .filter((value: any): value is string => typeof value === 'string' && value.length > 0),
      ),
    );

    const [chaptersResult, coursesResult] = await Promise.all([
        chapterIds.length
          ? supabase
              .from('chapters')
              .select('id,title,status,deleted_at')
              .in('id', chapterIds)
          : Promise.resolve({ data: [], error: null } as const),
        courseIds.length
          ? supabase
              .from('courses')
              .select('id,title,status,deleted_at')
              .in('id', courseIds)
          : Promise.resolve({ data: [], error: null } as const),
      ]);
    const chaptersData = chaptersResult?.data ?? [];
    const coursesData = coursesResult?.data ?? [];
    if (chaptersResult?.error) {
      console.warn('test-progress: chapters fetch error', chaptersResult.error);
    }
    if (coursesResult?.error) {
      console.warn('test-progress: courses fetch error', coursesResult.error);
    }

    const chapterMap = new Map(
      (chaptersData || []).map((chapter: any) => [chapter.id, chapter]),
    );
    const courseMap = new Map((coursesData || []).map((course: any) => [course.id, course]));

    const visibleTests = rawTests.filter((test: any) => {
      if (test.course_id) {
        const course = courseMap.get(test.course_id);
        if (!course) return false;
        if (course.status !== 'published') return false;
        if (course.deleted_at) return false;
      }
      if (test.chapter_id) {
        const chapter = chapterMap.get(test.chapter_id);
        if (!chapter) return false;
        if (chapter.status !== 'published') return false;
        if (chapter.deleted_at) return false;
      }
      return true;
    });

    let passedRows: Array<{ test_id: string }> = [];
    const passedResult = await supabase
      .from('test_results')
      .select('test_id')
      .eq('user_id', user.id)
      .eq('is_passed', true);
    if (passedResult.error) {
      if ((passedResult.error as any)?.code === '42P01') {
        console.warn('test-progress: test_results table missing, skipping pass aggregation');
      } else {
        console.warn('test-progress: test_results fetch error', passedResult.error);
      }
    } else {
      passedRows = passedResult.data ?? [];
    }

    const passedIds = new Set(passedRows.map((row) => row.test_id));

    const groups = new Map<
      string,
      { chapterId: string | null; chapterTitle: string; totalTests: number; passedTests: number }
    >();

    visibleTests.forEach((test: any) => {
      const chapterId = test.chapter_id ?? null;
      const chapter = chapterId ? chapterMap.get(chapterId) : null;
      const key = chapterId ?? `course:${test.course_id ?? 'none'}`;
      const title = chapter?.title || courseMap.get(test.course_id)?.title || '未分類';
      if (!groups.has(key)) {
        groups.set(key, {
          chapterId,
          chapterTitle: title,
          totalTests: 0,
          passedTests: 0,
        });
      }
      const group = groups.get(key)!;
      group.totalTests += 1;
      if (passedIds.has(test.id)) {
        group.passedTests += 1;
      }
    });

    const result = Array.from(groups.values()).sort((a, b) => b.totalTests - a.totalTests);

    return NextResponse.json({ chapters: result });
  } catch (error: any) {
    console.error('test-progress error', error);
    const message = error?.message ?? 'failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
