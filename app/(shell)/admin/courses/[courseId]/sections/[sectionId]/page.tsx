import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ToastFromQuery from '@/components/ui/ToastFromQuery';
import Link from 'next/link';
import { updateSectionMeta, saveSectionContent, softDeleteSection, restoreSection } from './actions';
import MarkdownEditor from '@/components/admin/MarkdownEditor';

export default async function SectionDetailPage({ params, searchParams }: { params: { courseId: string; sectionId: string }; searchParams?: Record<string, string | string[] | undefined> }) {
  await requireRole(['staff','admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  const supabase = createServerSupabaseClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id,title,chapter_id,course_id,status,duration_min,content_md,deleted_at')
    .eq('id', params.sectionId)
    .single();
  const { data: course } = await supabase.from('courses').select('id,title').eq('id', params.courseId).single();
  const { data: chapter } = lesson?.chapter_id
    ? await supabase.from('chapters').select('id,title').eq('id', lesson.chapter_id).single()
    : { data: null };
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id,title')
    .eq('course_id', params.courseId)
    .is('deleted_at', null)
    .order('chapter_sort_key', { ascending: true });

  const saveMeta = updateSectionMeta.bind(null, params.courseId, params.sectionId);
  const saveContent = saveSectionContent.bind(null, params.courseId, params.sectionId);
  const doSoftDelete = softDeleteSection.bind(null, params.courseId, params.sectionId);
  const doRestore = restoreSection.bind(null, params.courseId, params.sectionId);
  

  return (
    <div className="space-y-6">
      <ToastFromQuery />
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          <Link href="/admin/courses" className="underline decoration-white/20 hover:decoration-white">Courses</Link>
          <span className="mx-1">›</span>
          {course?.title && <><Link href={`/admin/courses/${course.id}`} className="underline decoration-white/20 hover:decoration-white">{course.title}</Link><span className="mx-1">›</span></>}
          {chapter?.title && <><span>{chapter.title}</span><span className="mx-1">›</span></>}
          <span className="text-slate-700">{lesson?.title || 'セクション'}</span>
        </div>
        <Link href={`/admin/courses/${params.courseId}`} className="rounded-xl bg-brand-sky/10 px-3 py-2 text-sm focus-ring">← コース詳細に戻る</Link>
      </div>

      {/* セクション情報 */}
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-4">
        <h2 className="mb-3 font-medium">セクション情報</h2>
        <form action={saveMeta} className="grid gap-4 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">タイトル</span>
            <input name="title" defaultValue={lesson?.title || ''} required maxLength={120} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">所属チャプター</span>
            <select name="chapter_id" defaultValue={lesson?.chapter_id || ''} required className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring">
              <option value="">選択してください</option>
              {(chapters || []).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">公開管理</span>
            <select name="status" defaultValue={lesson?.status || 'draft'} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring">
              <option value="draft">非公開（draft）</option>
              <option value="published">公開（published）</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">所要時間（分）</span>
            <input type="number" name="duration_min" min={0} max={1440} step={1} defaultValue={lesson?.duration_min || 0} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" />
          </label>
          <div className="pt-1">
            <button type="submit" className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring">保存</button>
          </div>
        </form>
        <div className="flex gap-2 pt-2">
          {!lesson?.deleted_at ? (
            <form action={doSoftDelete}><button className="rounded-xl bg-brand-sky/10 px-3 py-2 text-sm focus-ring" type="submit">削除</button></form>
          ) : (
            <form action={doRestore}><button className="rounded-xl bg-brand-sky/10 px-3 py-2 text-sm focus-ring" type="submit">復元</button></form>
          )}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">コンテンツ</h2>
          <button className="rounded-xl bg-brand-yellow px-3 py-2 text-brand focus-ring text-sm" form="section-content-form" type="submit">保存</button>
        </div>
        <form id="section-content-form" action={saveContent}>
          <input id="section-content-md" type="hidden" name="content_md" defaultValue={lesson?.content_md || ''} />
        </form>
        <MarkdownEditor initialMarkdown={lesson?.content_md || ''} formId="section-content-form" fieldId="section-content-md" sectionId={params.sectionId} />
      </div>
    </div>
  );
}

// (No client inline component needed; BlockEditor handles submission by form/field IDs)
