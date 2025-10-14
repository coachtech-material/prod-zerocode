"use server";

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function updateSectionMeta(courseId: string, sectionId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const title = String(formData.get('title') || '').trim();
  const chapter_id = String(formData.get('chapter_id') || '').trim();
  const status = String(formData.get('status') || '').trim();
  const durationRaw = String(formData.get('duration_min') || '0');
  const duration_min = Number(durationRaw);

  if (!title) redirect(pathWithMsg(courseId, sectionId, { error: 'タイトルは必須です' }));
  if (!chapter_id) redirect(pathWithMsg(courseId, sectionId, { error: '所属チャプターを選択してください' }));
  if (!['draft', 'published'].includes(status)) redirect(pathWithMsg(courseId, sectionId, { error: '不正なステータスです' }));
  if (!Number.isInteger(duration_min) || duration_min < 0 || duration_min > 1440) redirect(pathWithMsg(courseId, sectionId, { error: '所要時間は0〜1440の整数で入力してください' }));

  const patch: any = {
    title,
    chapter_id,
    status,
    duration_min,
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  if (status === 'published') {
    patch.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from('lessons').update(patch).eq('id', sectionId);
  if (error) redirect(pathWithMsg(courseId, sectionId, { error: error.message }));
  redirect(pathWithMsg(courseId, sectionId, { message: 'セクション情報を保存しました' }));
}

export async function softDeleteSection(courseId: string, sectionId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.from('lessons').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: user!.id }).eq('id', sectionId);
  if (error) redirect(pathWithMsg(courseId, sectionId, { error: error.message }));
  redirect(pathWithMsg(courseId, sectionId, { message: 'セクションを削除しました（ソフト削除）' }));
}

export async function restoreSection(courseId: string, sectionId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.from('lessons').update({ deleted_at: null, updated_at: new Date().toISOString(), updated_by: user!.id }).eq('id', sectionId);
  if (error) redirect(pathWithMsg(courseId, sectionId, { error: error.message }));
  redirect(pathWithMsg(courseId, sectionId, { message: 'セクションを復元しました' }));
}

export async function deleteSectionHard(courseId: string, sectionId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.from('lessons').delete().eq('id', sectionId);
  if (error) redirect(pathWithMsg(courseId, sectionId, { error: error.message }));
  redirect(`/admin/courses/${courseId}?message=${encodeURIComponent('セクションを完全削除しました')}`);
}

export async function saveSectionContent(courseId: string, sectionId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const content_md = String(formData.get('content_md') || '');
  const { error } = await supabase
    .from('lessons')
    .update({ content_md, updated_at: new Date().toISOString(), updated_by: user!.id })
    .eq('id', sectionId);
  if (error) redirect(pathWithMsg(courseId, sectionId, { error: error.message }));
  redirect(pathWithMsg(courseId, sectionId, { message: 'コンテンツを保存しました' }));
}

function pathWithMsg(courseId: string, sectionId: string, q: { message?: string; error?: string }) {
  const params = new URLSearchParams();
  if (q.message) params.set('message', q.message);
  if (q.error) params.set('error', q.error);
  return `/admin/courses/${courseId}/sections/${sectionId}?${params.toString()}`;
}

