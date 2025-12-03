import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { updateCourseDescription, updateCourseMeta, updateCourseStatus, softDeleteCourse, restoreCourse } from '../actions';
import UploadThumbnail from '@/components/admin/UploadThumbnail';
import UploadOverviewVideo from '@/components/admin/UploadOverviewVideo';
import ToastFromQuery from '@/components/ui/ToastFromQuery';
import AddContentModal from '@/components/admin/AddContentModal';
import OpenAddContentButton from '@/components/admin/OpenAddContentButton';
import ContentTable from '@/components/admin/ContentTable';

export default async function CourseDetailPage({ params, searchParams }: { params: { courseId: string }; searchParams?: Record<string, string | string[] | undefined> }) {
  await requireRole(['staff','admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id,title,description_md,thumbnail_url,overview_video_url,status,sort_key,deleted_at')
    .eq('id', params.courseId)
    .single();

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id,title,status,order_index,duration_min')
    .eq('course_id', params.courseId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id,title,status,chapter_sort_key')
    .eq('course_id', params.courseId)
    .is('deleted_at', null)
    .order('chapter_sort_key', { ascending: true });

  // Sections grouped by chapter
  const { data: sections } = await supabase
    .from('lessons')
    .select('id,title,status,section_sort_key,duration_min,chapter_id')
    .eq('course_id', params.courseId)
    .is('deleted_at', null)
    .order('section_sort_key', { ascending: true });

  const totalDuration = (lessons || [])
    .filter((l) => l.status === 'published')
    .reduce((acc, l) => acc + (l.duration_min || 0), 0);


  const err = typeof searchParams?.error === 'string' ? searchParams!.error : undefined;
  const msg = typeof searchParams?.message === 'string' ? searchParams!.message : undefined;

  const saveDesc = updateCourseDescription.bind(null, params.courseId);
  const saveMeta = updateCourseMeta.bind(null, params.courseId);
  const saveStatus = updateCourseStatus.bind(null, params.courseId);
  const doSoftDeleteCourse = softDeleteCourse.bind(null, params.courseId);
  const doRestoreCourse = restoreCourse.bind(null, params.courseId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">コース詳細</h1>
      <ToastFromQuery />
      {course ? (
        <div className="space-y-6">
          {/* Toasts handle success/error messaging */}

          {/* Preview removed as requested */}

          {/* Basic info: includes key, title, description, media, publish status, duration */}
          <div className="rounded-2xl border border-white/10 bg-[color:var(--surface-1)] p-4 shadow-[0_15px_35px_rgba(0,0,0,0.35)] space-y-6">
            <h2 className="font-medium">基本情報</h2>

            {/* Key + Title */}
            <form action={saveMeta} className="grid gap-4 max-w-xl">
              <label className="grid gap-1">
                <span className="text-sm text-[color:var(--muted)]">キー（表示順）</span>
                <input name="sort_key" type="number" min={1} step={1} defaultValue={course.sort_key} className="rounded-xl bg-white/5 px-3 py-2 text-[color:var(--text)] focus-ring" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-[color:var(--muted)]">コース名</span>
                <input name="title" defaultValue={course.title} required maxLength={120} className="rounded-xl bg-white/5 px-3 py-2 text-[color:var(--text)] focus-ring" />
              </label>
              <div>
                <button type="submit" className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring">基本情報を保存</button>
              </div>
            </form>

            {/* Course description editor */}
            <div>
              <h3 className="mb-2 text-sm text-[color:var(--muted)]">コース説明</h3>
              <form action={saveDesc} className="grid gap-3">
                <textarea name="description_md" defaultValue={course.description_md || ''} rows={10} className="rounded-xl bg-white/5 px-3 py-2 text-[color:var(--text)] focus-ring" />
                <div>
                  <button type="submit" className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring">説明を保存</button>
                </div>
              </form>
            </div>

            {/* Media import */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm text-[color:var(--muted)] mb-2">サムネイル画像</h3>
                <UploadThumbnail courseId={course.id} url={course.thumbnail_url || null} />
              </div>
              <div>
                <h3 className="text-sm text-[color:var(--muted)] mb-2">コース概要動画（任意）</h3>
                <UploadOverviewVideo courseId={course.id} url={course.overview_video_url || null} />
              </div>
            </div>

            {/* Publish status (editable dropdown) */}
            <div className="grid gap-2 max-w-xs">
              <span className="text-sm text-[color:var(--muted)]">公開ステータス</span>
              <form action={saveStatus} className="flex items-center gap-2">
                <select name="status" defaultValue={course.status} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-[color:var(--text)] focus-ring">
                  <option value="draft">非公開（draft）</option>
                  <option value="published">公開（published）</option>
                </select>
                <button type="submit" className="rounded-xl bg-brand-yellow px-3 py-2 text-brand focus-ring text-sm">変更</button>
              </form>
            </div>

          {/* Duration */}
          <div className="grid gap-1">
            <span className="text-sm text-[color:var(--muted)]">所要時間（公開中の合計）</span>
            <div className="text-[color:var(--muted)]">{totalDuration} 分</div>
          </div>

            {/* Delete/Restore course */}
            <div className="pt-2 flex items-center gap-2">
              {!course?.deleted_at ? (
                <form action={doSoftDeleteCourse}>
                  <button type="submit" className="rounded-xl bg-white/5 px-3 py-2 text-sm focus-ring">コースを削除</button>
                </form>
              ) : (
                <form action={doRestoreCourse}>
                  <button type="submit" className="rounded-xl bg-white/5 px-3 py-2 text-sm focus-ring">コースを復元</button>
                </form>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[color:var(--surface-1)] p-0 shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <h3 className="font-medium text-[color:var(--text)]">コースコンテンツ一覧</h3>
              <OpenAddContentButton />
            </div>
            <ContentTable
              chapters={(chapters || []).map((c: any) => ({
                id: c.id,
                title: c.title,
                status: c.status,
                chapter_sort_key: (c as any).chapter_sort_key,
              }))}
              sections={(sections || []).map((s: any) => ({
                id: s.id,
                title: s.title,
                status: s.status,
                section_sort_key: s.section_sort_key,
                duration_min: s.duration_min,
                chapter_id: s.chapter_id,
              }))}
              courseId={course?.id || params.courseId}
            />
          </div>
          <AddContentModal courseId={course.id} chapters={(chapters || []).map((c: any) => ({ id: c.id, title: c.title }))} />
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[color:var(--surface-1)] p-4 text-[color:var(--text)]">コースが見つかりませんでした。</div>
      )}
    </div>
  );
}
