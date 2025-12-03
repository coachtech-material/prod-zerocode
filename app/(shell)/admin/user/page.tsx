import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import UserTabs from '@/components/admin/UserTabs';
import UserInviteForm from '@/components/admin/UserInviteForm';
import ProgressManager from '@/components/admin/ProgressManager';

export const dynamic = 'force-dynamic';

type CourseRecord = { id: string; title: string };
type ChapterRecord = { id: string; title: string; course_id: string };
type SectionRecord = { id: string; title: string; course_id: string; chapter_id: string; section_sort_key: number | null };
type StudentRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'user';
  last_sign_in_at: string | null;
  inactive: boolean;
  phone: string | null;
  issued_at: string | null;
  login_disabled: boolean;
  ops_tagged: boolean;
  interview_completed: boolean;
};
type OperatorRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  issued_at: string | null;
  ops_tagged: true;
  interview_completed: true;
};

type ProgressLimitView = {
  id: string;
  courseId: string;
  chapterId: string;
  sectionId: string;
  courseTitle: string;
  chapterTitle: string;
  sectionTitle: string;
  createdAt: string | null;
};

type BlockedUserView = {
  userId: string;
  name: string;
  email: string | null;
  courseTitle: string;
  chapterTitle: string;
  sectionTitle: string;
};

export default async function AdminUserPage() {
  const { profile } = await requireRole(['staff','admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  const supabase = createServerSupabaseClient();

  const [
    { data: stu },
    { data: ops },
    { data: courses },
    { data: chapters },
    { data: lessons },
    { data: limits },
  ] = await Promise.all([
    supabase.rpc('ops_list_users_with_status'),
    supabase.rpc('ops_list_staff_admin'),
    supabase
      .from('courses')
      .select('id,title')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('sort_key', { ascending: true })
      .order('title', { ascending: true }),
    supabase
      .from('chapters')
      .select('id,title,course_id')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('course_id', { ascending: true })
      .order('chapter_sort_key', { ascending: true }),
    supabase
      .from('lessons')
      .select('id,title,course_id,chapter_id,section_sort_key')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('course_id', { ascending: true })
      .order('chapter_id', { ascending: true })
      .order('section_sort_key', { ascending: true }),
    supabase.from('progress_limits').select('id,course_id,chapter_id,section_id,created_at'),
  ]);

  const courseList: CourseRecord[] = (courses || []).map((c: any) => ({
    id: c.id as string,
    title: (c.title as string) ?? 'コース',
  }));
  const chapterList: ChapterRecord[] = (chapters || []).map((ch: any) => ({
    id: ch.id as string,
    title: (ch.title as string) ?? 'チャプター',
    course_id: (ch.course_id as string) ?? '',
  }));
  const sectionList: SectionRecord[] = (lessons || []).map((lesson: any) => ({
    id: lesson.id as string,
    title: (lesson.title as string) ?? 'セクション',
    course_id: (lesson.course_id as string) ?? '',
    chapter_id: (lesson.chapter_id as string) ?? '',
    section_sort_key: (lesson.section_sort_key as number | null) ?? null,
  }));
  const courseMap = new Map(courseList.map((c) => [c.id, c.title]));
  const chapterMap = new Map(chapterList.map((c) => [c.id, c.title]));
  const sectionMap = new Map(sectionList.map((s) => [s.id, s]));

  const limitEntries: ProgressLimitView[] = (limits || []).map((limit: any) => ({
    id: limit.id as string,
    courseId: limit.course_id as string,
    chapterId: limit.chapter_id as string,
    sectionId: limit.section_id as string,
    courseTitle: courseMap.get(limit.course_id as string) ?? 'コース',
    chapterTitle: chapterMap.get(limit.chapter_id as string) ?? 'チャプター',
    sectionTitle: sectionMap.get(limit.section_id as string)?.title ?? 'セクション',
    createdAt: (limit.created_at as string | null) ?? null,
  }));

  const students: StudentRecord[] = (stu || []).map((r: any): StudentRecord => ({
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
  }));

  const operators: OperatorRecord[] = (ops || []).map((r: any): OperatorRecord => ({
    id: r.id as string,
    first_name: (r.first_name as string | null) ?? null,
    last_name: (r.last_name as string | null) ?? null,
    role: r.role as string,
    issued_at: (r.issued_at as string | null) ?? null,
    ops_tagged: true,
    interview_completed: true,
  }));

  const limitSectionIds = limitEntries.map((l) => l.sectionId);
  let blockedUsers: BlockedUserView[] = [];
  if (limitSectionIds.length) {
    const { data: progressHits } = await supabase
      .from('progress')
      .select('user_id,lesson_id,is_completed,is_unlocked')
      .in('lesson_id', limitSectionIds);
    const hits = (progressHits || []) as Array<{ user_id: string; lesson_id: string; is_completed?: boolean; is_unlocked?: boolean }>;
    const studentMap = new Map(students.map((student) => [student.id, student]));
    const seen = new Set<string>();
    blockedUsers = hits
      .map((hit) => {
        if (seen.has(hit.user_id)) return null;
        if (!hit.is_completed && !hit.is_unlocked) return null;
        const profile = studentMap.get(hit.user_id);
        if (!profile || profile.interview_completed) return null;
        const section = sectionMap.get(hit.lesson_id);
        if (!section) return null;
        seen.add(hit.user_id);
        return {
          userId: hit.user_id,
          name: [profile.last_name || '', profile.first_name || ''].filter(Boolean).join(' ').trim() || '(未設定)',
          email: profile.email,
          courseTitle: courseMap.get(section.course_id) ?? 'コース',
          chapterTitle: chapterMap.get(section.chapter_id) ?? 'チャプター',
          sectionTitle: section.title,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ユーザー管理</h1>
      <UserInviteForm viewerRole={profile.role} />
      <ProgressManager
        courses={courseList}
        chapters={chapterList}
        sections={sectionList}
        limits={limitEntries}
        blockedUsers={blockedUsers}
      />
      <UserTabs
        students={students}
        ops={operators}
        viewerRole={profile.role}
      />
    </div>
  );
}
