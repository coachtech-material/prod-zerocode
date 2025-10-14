"use server";

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function back(courseId: string, sectionId: string, q?: { message?: string; error?: string }) {
  const s = new URLSearchParams();
  if (q?.message) s.set('message', q.message);
  if (q?.error) s.set('error', q.error);
  return `/courses/${courseId}/sections/${sectionId}` + (s.toString() ? `?${s}` : '');
}

export async function toggleComplete(courseId: string, sectionId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: existing } = await supabase.from('progress').select('is_completed').eq('course_id', courseId).eq('lesson_id', sectionId).single();
  const next = !existing?.is_completed;
  const { error } = await supabase.from('progress').upsert({ user_id: user.id, course_id: courseId, lesson_id: sectionId, is_completed: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' });
  if (error) redirect(back(courseId, sectionId, { error: error.message }));
  redirect(back(courseId, sectionId, { message: next ? '完了にしました' : '未完了にしました' }));
}

export async function markSectionCompleted(courseId: string, sectionId: string) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'ログインが必要です' };
  }

  const { data: existing } = await supabase
    .from('progress')
    .select('is_completed,is_unlocked,time_spent_sec')
    .eq('course_id', courseId)
    .eq('lesson_id', sectionId)
    .single();

  if (existing?.is_completed) {
    return { success: true, alreadyCompleted: true };
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    course_id: courseId,
    lesson_id: sectionId,
    is_completed: true,
    updated_at: new Date().toISOString(),
  };

  if (existing && 'time_spent_sec' in existing) {
    payload.time_spent_sec = (existing as any).time_spent_sec;
  }
  payload.is_unlocked = existing?.is_unlocked ?? true;

  const { error } = await supabase.from('progress').upsert(payload, { onConflict: 'user_id,lesson_id' });
  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true };
}

export async function addTimeSpent(courseId: string, sectionId: string, formData: FormData) {
  const sec = Number(String(formData.get('sec') || '0'));
  if (!Number.isFinite(sec) || sec <= 0) return;
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from('progress')
    .select('time_spent_sec')
    .eq('course_id', courseId)
    .eq('lesson_id', sectionId)
    .single();
  const base = (data as any)?.time_spent_sec || 0;
  await supabase
    .from('progress')
    .upsert({ user_id: user.id, course_id: courseId, lesson_id: sectionId, time_spent_sec: base + Math.round(sec), updated_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' });
}
