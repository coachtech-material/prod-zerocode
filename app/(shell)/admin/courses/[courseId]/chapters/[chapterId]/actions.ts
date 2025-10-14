"use server";

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function backTo(courseId: string, chapterId: string, q?: { message?: string; error?: string }) {
  const params = new URLSearchParams();
  if (q?.message) params.set('message', q.message);
  if (q?.error) params.set('error', q.error);
  return `/admin/courses/${courseId}/chapters/${chapterId}` + (params.toString() ? `?${params.toString()}` : '');
}

export async function updateChapterMeta(courseId: string, chapterId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const title = String(formData.get('title') || '').trim();
  const sortKeyRaw = String(formData.get('chapter_sort_key') || '').trim();
  const status = String(formData.get('status') || '').trim();
  const sortKey = Number(sortKeyRaw);

  if (!title) redirect(backTo(courseId, chapterId, { error: 'チャプター名は必須です' }));
  if (!Number.isInteger(sortKey) || sortKey < 1) redirect(backTo(courseId, chapterId, { error: '表示順は1以上の整数で入力してください' }));
  if (!['draft', 'published'].includes(status)) redirect(backTo(courseId, chapterId, { error: '不正なステータスです' }));

  // Update chapter title/status
  const { error: upErr } = await supabase
    .from('chapters')
    .update({ title, status, updated_at: new Date().toISOString(), updated_by: user!.id })
    .eq('id', chapterId)
    .eq('course_id', courseId);
  if (upErr) redirect(backTo(courseId, chapterId, { error: upErr.message }));

  // Resequence all chapters within the course to 1..N with this chapter at desired position
  const { data: allCh } = await supabase
    .from('chapters')
    .select('id')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('chapter_sort_key', { ascending: true });
  const ids = (allCh || []).map((r: any) => r.id);
  const filtered = ids.filter((id: string) => id !== chapterId);
  const insertIndex = Math.max(0, Math.min(filtered.length, sortKey - 1));
  filtered.splice(insertIndex, 0, chapterId);
  let i = 1;
  for (const id of filtered) {
    const { error } = await supabase
      .from('chapters')
      .update({ chapter_sort_key: i++, updated_at: new Date().toISOString(), updated_by: user!.id })
      .eq('id', id);
    if (error) redirect(backTo(courseId, chapterId, { error: error.message }));
  }
  redirect(backTo(courseId, chapterId, { message: 'チャプター情報を保存しました' }));
}

export async function softDeleteChapter(courseId: string, chapterId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase
    .from('chapters')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: user!.id })
    .eq('id', chapterId)
    .eq('course_id', courseId);
  if (error) redirect(backTo(courseId, chapterId, { error: error.message }));
  redirect(backTo(courseId, chapterId, { message: 'チャプターを削除しました（ソフト削除）' }));
}

export async function restoreChapter(courseId: string, chapterId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase
    .from('chapters')
    .update({ deleted_at: null, updated_at: new Date().toISOString(), updated_by: user!.id })
    .eq('id', chapterId)
    .eq('course_id', courseId);
  if (error) redirect(backTo(courseId, chapterId, { error: error.message }));
  redirect(backTo(courseId, chapterId, { message: 'チャプターを復元しました' }));
}

export async function deleteChapterHard(courseId: string, chapterId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', chapterId)
    .eq('course_id', courseId);
  if (error) redirect(backTo(courseId, chapterId, { error: error.message }));
  redirect(`/admin/courses/${courseId}?message=${encodeURIComponent('チャプターを完全削除しました')}`);
}

export async function deleteChapter(courseId: string, chapterId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = prof?.role === 'admin';
  if (isAdmin) {
    const { error } = await supabase.from('chapters').delete().eq('id', chapterId).eq('course_id', courseId);
    if (error) redirect(backTo(courseId, chapterId, { error: error.message }));
    redirect(`/admin/courses/${courseId}?message=${encodeURIComponent('チャプターを削除しました（admin: 完全削除）')}`);
  } else {
    const { error } = await supabase
      .from('chapters')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', chapterId)
      .eq('course_id', courseId);
    if (error) redirect(backTo(courseId, chapterId, { error: error.message }));
    redirect(backTo(courseId, chapterId, { message: 'チャプターを削除しました（ソフト削除）' }));
  }
}

export async function createSectionInChapter(courseId: string, chapterId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const title = String(formData.get('title') || '').trim();
  if (!title) redirect(backTo(courseId, chapterId, { error: 'セクション名は必須です' }));
  // Insert draft section
  const { data: ins, error: insErr } = await supabase
    .from('lessons')
    .insert({ title, course_id: courseId, chapter_id: chapterId, status: 'draft', created_by: user.id, updated_by: user.id })
    .select('id')
    .single();
  if (insErr || !ins) redirect(backTo(courseId, chapterId, { error: insErr?.message || '作成に失敗しました' }));
  const { data: list } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('chapter_id', chapterId)
    .is('deleted_at', null)
    .order('section_sort_key', { ascending: true });
  const ids = (list || []).map((r:any)=>r.id).filter((id:string)=>id!==ins.id);
  ids.push(ins.id);
  let i = 1;
  for (const id of ids) {
    await supabase.from('lessons').update({ section_sort_key: i++, updated_at: new Date().toISOString(), updated_by: user.id }).eq('id', id);
  }
  redirect(backTo(courseId, chapterId, { message: 'セクションを追加しました' }));
}

export async function reorderSectionsWithinChapter(courseId: string, chapterId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const orderedRaw = String(formData.get('ordered') || '').trim();
  if (!orderedRaw) redirect(backTo(courseId, chapterId, { error: '順序データが空です' }));
  const ids = orderedRaw.split(',').map((s) => s.trim()).filter(Boolean);
  let i = 1;
  for (const id of ids) {
    const { error } = await supabase
      .from('lessons')
      .update({ section_sort_key: i++, updated_at: new Date().toISOString(), updated_by: user!.id })
      .eq('id', id)
      .eq('chapter_id', chapterId)
      .eq('course_id', courseId);
    if (error) redirect(backTo(courseId, chapterId, { error: error.message }));
  }
  redirect(backTo(courseId, chapterId, { message: '並び順を保存しました' }));
}
