import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ToastFromQuery from '@/components/ui/ToastFromQuery';
import Link from 'next/link';
import { updateChapterMeta, softDeleteChapter, restoreChapter, deleteChapter, reorderSectionsWithinChapter, createSectionInChapter } from './actions';
import SectionsReorderTable from '@/components/admin/SectionsReorderTable';

export default async function ChapterDetailPage({ params }: { params: { courseId: string; chapterId: string } }) {
  await requireRole(['staff','admin'], { redirectTo: '/ops-login', signOutOnFail: true });
  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase.from('courses').select('id,title').eq('id', params.courseId).single();
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id,title,chapter_sort_key,status,deleted_at')
    .eq('id', params.chapterId)
    .eq('course_id', params.courseId)
    .single();

  const { data: sections } = await supabase
    .from('lessons')
    .select('id,title,status,section_sort_key,duration_min')
    .eq('course_id', params.courseId)
    .eq('chapter_id', params.chapterId)
    .is('deleted_at', null)
    .order('section_sort_key', { ascending: true });

  const totalDuration = (sections || [])
    .filter((s) => s.status === 'published')
    .reduce((acc, s) => acc + (s.duration_min || 0), 0);

  const saveMeta = updateChapterMeta.bind(null, params.courseId, params.chapterId);
  const doDelete = deleteChapter.bind(null, params.courseId, params.chapterId);
  const doRestore = restoreChapter.bind(null, params.courseId, params.chapterId);
  const saveOrder = reorderSectionsWithinChapter.bind(null, params.courseId, params.chapterId);
  const addSection = createSectionInChapter.bind(null, params.courseId, params.chapterId);

  return (
    <div className="space-y-6">
      <ToastFromQuery />
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          <Link href="/admin/courses" className="underline decoration-white/20 hover:decoration-white">Courses</Link>
          <span className="mx-1">›</span>
          {course?.title && <><Link href={`/admin/courses/${course.id}`} className="underline decoration-white/20 hover:decoration-white">{course.title}</Link><span className="mx-1">›</span></>}
          <span className="text-slate-700">{chapter?.title || 'Chapter'}</span>
        </div>
        <Link href={`/admin/courses/${params.courseId}`} className="rounded-xl bg-brand-sky/10 px-3 py-2 text-sm focus-ring">← コース詳細に戻る</Link>
      </div>

      {/* チャプター情報 */}
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-4">
        <h2 className="mb-3 font-medium">チャプター情報</h2>
        <form action={saveMeta} className="grid gap-4 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">チャプター名</span>
            <input name="title" defaultValue={chapter?.title || ''} required maxLength={120} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">表示順</span>
            <input name="chapter_sort_key" type="number" min={1} step={1} defaultValue={chapter?.chapter_sort_key || 1} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">公開</span>
            <select name="status" defaultValue={chapter?.status || 'draft'} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring">
              <option value="draft">非公開（draft）</option>
              <option value="published">公開（published）</option>
            </select>
          </label>
          <div className="grid gap-1">
            <span className="text-sm text-slate-600">所要時間（公開中セクション合計）</span>
            <div className="text-slate-600">{totalDuration} 分</div>
          </div>
          <div className="pt-1">
            <button type="submit" className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring">保存</button>
          </div>
        </form>
        <div className="flex gap-2 pt-2">
          {!chapter?.deleted_at ? (
            <form action={doDelete}><button className="rounded-xl bg-brand-sky/10 px-3 py-2 text-sm focus-ring" type="submit">削除</button></form>
          ) : (
            <form action={doRestore}><button className="rounded-xl bg-brand-sky/10 px-3 py-2 text-sm focus-ring" type="submit">復元</button></form>
          )}
        </div>
      </div>

      {/* 所属セクション一覧 + 並び替え */}
      <div className="flex items-center justify-between">
        <form action={addSection} className="ml-auto flex items-center gap-2">
          <input name="title" required maxLength={120} placeholder="新規セクション名" className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring text-sm" />
          <button type="submit" className="rounded-xl bg-brand-yellow px-3 py-2 text-brand focus-ring text-sm">セクションを追加</button>
        </form>
      </div>
      <form id="sections-order-form" action={saveOrder}>
        <input id="sections-order-field" type="hidden" name="ordered" />
      </form>
      <SectionsReorderTable
        courseId={params.courseId}
        chapterId={params.chapterId}
        rows={(sections || []).map((s:any)=>({ id:s.id, title:s.title, status:s.status, section_sort_key:s.section_sort_key, duration_min:s.duration_min || 0 }))}
        formId="sections-order-form"
        orderedFieldId="sections-order-field"
      />
    </div>
  );
}
