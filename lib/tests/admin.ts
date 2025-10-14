"use server";

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/requireRole';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function loadTestWithMeta(id: string) {
  const supabase = createServerSupabaseClient();
  const [{ data: test }, { data: courses }, { data: chapters }] = await Promise.all([
    supabase.from('tests').select('*').eq('id', id).single(),
    supabase
      .from('courses')
      .select('id,title')
      .is('deleted_at', null)
      .order('sort_key', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('chapters')
      .select('id,title,course_id')
      .is('deleted_at', null)
      .order('chapter_sort_key', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);
  return { test: (test as any) || null, courses: courses || [], chapters: chapters || [] };
}

export async function updateTestBasic(formData: FormData) {
  // Authorization (DRY: reuse shared guard)
  await requireRole(['staff', 'admin']);
  const supabase = createServerSupabaseClient();

  const id = String(formData.get('id') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const course_id = String(formData.get('course_id') || '').trim();
  const chapter_id_raw = String(formData.get('chapter_id') || '').trim();
  const chapter_id = chapter_id_raw ? chapter_id_raw : null;
  const mode = String(formData.get('mode') || '').trim() || null;
  const statusRaw = String(formData.get('status') || '').trim();
  const status = statusRaw && (statusRaw === 'published' || statusRaw === 'draft') ? statusRaw : undefined;
  if (!id || !title || !course_id) return { ok: false, error: 'invalid' } as const;

  const update: any = { title, course_id, chapter_id };
  if (mode) update.mode = mode;
  if (status) update.status = status;

  const { error } = await supabase.from('tests').update(update).eq('id', id);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath(`/admin/test/comfirm/${id}`);
  return redirect(`/admin/test/comfirm/${id}?tab=basic&message=${encodeURIComponent('変更を保存しました')}`);
}

