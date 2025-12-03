"use server";

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function isHttpsUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function createCourse(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const title = String(formData.get('title') || '').trim();

  if (!title) {
    redirect('/admin/courses?error=' + encodeURIComponent('タイトルは必須です'));
  }

  // Compute next sort_key (max + 1 where not deleted)
  const { data: maxRows } = await supabase
    .from('courses')
    .select('sort_key')
    .is('deleted_at', null)
    .order('sort_key', { ascending: false })
    .limit(1);
  const nextKey = (maxRows && maxRows[0]?.sort_key ? Number(maxRows[0].sort_key) : 0) + 1;

  const { error } = await supabase.from('courses').insert({
    title,
    status: 'draft',
    sort_key: nextKey,
    created_by: user!.id,
    updated_by: user!.id,
  });

  if (error) {
    redirect('/admin/courses?error=' + encodeURIComponent(error.message));
  }

  redirect('/admin/courses?message=' + encodeURIComponent('コースを作成しました'));
}

export async function updateCourseDescription(courseId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const description_md = String(formData.get('description_md') || '');

  const { error } = await supabase
    .from('courses')
    .update({ description_md, updated_by: user!.id, updated_at: new Date().toISOString() })
    .eq('id', courseId);

  if (error) {
    redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(error.message));
  }
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('保存しました'));
}

export async function updateCourseMeta(courseId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const title = String(formData.get('title') || '').trim();
  const sortKeyRaw = String(formData.get('sort_key') || '').trim();
  const sortKey = Number(sortKeyRaw);
  if (!title) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('コース名は必須です'));
  if (!Number.isInteger(sortKey) || sortKey < 1) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('キーは1以上の整数で入力してください'));

  // Update title
  const { error: upErr } = await supabase
    .from('courses')
    .update({ title, updated_by: user!.id, updated_at: new Date().toISOString() })
    .eq('id', courseId);
  if (upErr) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(upErr.message));

  // Re-sequence keys including requested position (client-side transaction)
  const { data: all } = await supabase
    .from('courses')
    .select('id, sort_key')
    .is('deleted_at', null)
    .order('sort_key', { ascending: true });

  const list = (all || []).map((r) => String((r as any).id));
  const filtered = list.filter((id) => id !== courseId);
  const insertIndex = Math.max(0, Math.min(filtered.length, sortKey - 1));
  filtered.splice(insertIndex, 0, courseId);
  const updates = filtered.map((id, i) => ({ id, sort_key: i + 1 }));

  // Apply updates row-by-row to avoid accidental inserts and NOT NULL violations
  for (const u of updates) {
    const { error: e } = await supabase
      .from('courses')
      .update({ sort_key: u.sort_key, updated_at: new Date().toISOString(), updated_by: user!.id })
      .eq('id', u.id);
    if (e) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(e.message));
  }
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('基本情報を保存しました'));
}

export async function uploadThumbnail(courseId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const file = formData.get('file');
  if (!(file instanceof File)) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('ファイルが選択されていません'));
  if (!['image/png', 'image/jpeg'].includes(file.type)) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('PNG/JPEGのみ対応'));
  if (file.size > 5 * 1024 * 1024) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('ファイルサイズは5MB以下にしてください'));
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${courseId}/thumb-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('thumbnails').upload(path, file, { cacheControl: '604800', upsert: false });
  if (upErr) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(upErr.message));
  const { data: pub } = supabase.storage.from('thumbnails').getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // Remove old file if exists
  const { data: current } = await supabase.from('courses').select('thumbnail_url').eq('id', courseId).single();
  const oldUrl: string | null = (current as any)?.thumbnail_url ?? null;
  if (oldUrl) {
    const prefix = '/object/public/thumbnails/';
    const idx = oldUrl.indexOf(prefix);
    if (idx !== -1) {
      const oldPath = oldUrl.slice(idx + prefix.length);
      await supabase.storage.from('thumbnails').remove([oldPath]);
    }
  }
  const { error: updErr } = await supabase.from('courses').update({ thumbnail_url: publicUrl, updated_at: new Date().toISOString(), updated_by: user!.id }).eq('id', courseId);
  if (updErr) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(updErr.message));
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('サムネイルを更新しました'));
}

export async function deleteThumbnail(courseId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: current } = await supabase.from('courses').select('thumbnail_url').eq('id', courseId).single();
  const oldUrl: string | null = (current as any)?.thumbnail_url ?? null;
  if (oldUrl) {
    const prefix = '/object/public/thumbnails/';
    const idx = oldUrl.indexOf(prefix);
    if (idx !== -1) {
      const oldPath = oldUrl.slice(idx + prefix.length);
      await supabase.storage.from('thumbnails').remove([oldPath]);
    }
  }
  await supabase.from('courses').update({ thumbnail_url: null, updated_at: new Date().toISOString(), updated_by: user!.id }).eq('id', courseId);
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('サムネイルを削除しました'));
}

export async function uploadOverviewVideo(courseId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const file = formData.get('file');
  if (!(file instanceof File)) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('ファイルが選択されていません'));
  if (!['video/mp4'].includes(file.type)) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('MP4のみ対応'));
  if (file.size > 100 * 1024 * 1024) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('ファイルサイズは100MB以下にしてください'));
  const ext = 'mp4';
  const path = `${courseId}/overview-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('lesson-assets').upload(path, file, { cacheControl: '3600', upsert: false });
  if (upErr) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(upErr.message));
  const { data: pub } = supabase.storage.from('lesson-assets').getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // Remove old
  const { data: current } = await supabase.from('courses').select('overview_video_url').eq('id', courseId).single();
  const oldUrl: string | null = (current as any)?.overview_video_url ?? null;
  if (oldUrl) {
    const prefix = '/object/public/lesson-assets/';
    const idx = oldUrl.indexOf(prefix);
    if (idx !== -1) {
      const oldPath = oldUrl.slice(idx + prefix.length);
      await supabase.storage.from('lesson-assets').remove([oldPath]);
    }
  }
  const { error: updErr } = await supabase.from('courses').update({ overview_video_url: publicUrl, updated_at: new Date().toISOString(), updated_by: user!.id }).eq('id', courseId);
  if (updErr) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(updErr.message));
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('概要動画を更新しました'));
}

export async function deleteOverviewVideo(courseId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: current } = await supabase.from('courses').select('overview_video_url').eq('id', courseId).single();
  const oldUrl: string | null = (current as any)?.overview_video_url ?? null;
  if (oldUrl) {
    const prefix = '/object/public/lesson-assets/';
    const idx = oldUrl.indexOf(prefix);
    if (idx !== -1) {
      const oldPath = oldUrl.slice(idx + prefix.length);
      await supabase.storage.from('lesson-assets').remove([oldPath]);
    }
  }
  await supabase.from('courses').update({ overview_video_url: null, updated_at: new Date().toISOString(), updated_by: user!.id }).eq('id', courseId);
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('概要動画を削除しました'));
}

export async function softDeleteCourse(courseId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase
    .from('courses')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: user!.id })
    .eq('id', courseId);
  if (error) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(error.message));
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('コースを削除しました（ソフト削除）'));
}

export async function restoreCourse(courseId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase
    .from('courses')
    .update({ deleted_at: null, updated_at: new Date().toISOString(), updated_by: user!.id })
    .eq('id', courseId);
  if (error) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(error.message));
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('コースを復元しました'));
}

export type CourseStructureReorderPayload = {
  chapterOrder: Array<{ id: string; order: number }>;
  sectionOrder: Array<{ id: string; chapterId: string; order: number }>;
};

export async function reorderCourseStructure(courseId: string, payload: CourseStructureReorderPayload) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!payload || !Array.isArray(payload.chapterOrder) || !Array.isArray(payload.sectionOrder)) {
    throw new Error('並び順の情報が不正です');
  }

  const nowIso = new Date().toISOString();

  for (const chapter of payload.chapterOrder) {
    if (!chapter.id) continue;
    const order = Number(chapter.order) || 0;
    await supabase
      .from('chapters')
      .update({ chapter_sort_key: order, updated_at: nowIso, updated_by: user!.id })
      .eq('id', chapter.id)
      .eq('course_id', courseId);
  }

  for (const section of payload.sectionOrder) {
    if (!section.id || !section.chapterId) continue;
    const order = Number(section.order) || 0;
    await supabase
      .from('lessons')
      .update({
        chapter_id: section.chapterId,
        section_sort_key: order,
        updated_at: nowIso,
        updated_by: user!.id,
      })
      .eq('id', section.id)
      .eq('course_id', courseId);
  }

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function setChapterStatus(courseId: string, chapterId: string, status: 'draft' | 'published') {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!['draft', 'published'].includes(status)) {
    throw new Error('不正なステータスです');
  }
  const { error } = await supabase
    .from('chapters')
    .update({ status, updated_at: new Date().toISOString(), updated_by: user!.id })
    .eq('id', chapterId)
    .eq('course_id', courseId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function setSectionStatus(courseId: string, sectionId: string, status: 'draft' | 'published') {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!['draft', 'published'].includes(status)) {
    throw new Error('不正なステータスです');
  }
  const { error } = await supabase
    .from('lessons')
    .update({ status, updated_at: new Date().toISOString(), updated_by: user!.id })
    .eq('id', sectionId)
    .eq('course_id', courseId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function createChapter(courseId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const title = String(formData.get('title') || '').trim();
  if (!title) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('チャプター名は必須です'));
  // Insert draft chapter first
  const { data: ins, error: insErr } = await supabase
    .from('chapters')
    .insert({ title, course_id: courseId, status: 'draft', created_by: user!.id, updated_by: user!.id })
    .select('id')
    .single();
  if (insErr || !ins) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(insErr?.message || '作成に失敗しました'));
  // Resequence chapter_sort_key within course
  const { data: list } = await supabase
    .from('chapters')
    .select('id')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('chapter_sort_key', { ascending: true });
  const ids = (list || []).map((r: any) => r.id);
  const filtered = ids.filter((id: string) => id !== ins.id);
  filtered.push(ins.id);
  let i = 1;
  for (const id of filtered) {
    await supabase.from('chapters').update({ chapter_sort_key: i++, updated_at: new Date().toISOString(), updated_by: user!.id }).eq('id', id);
  }
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('チャプターを追加しました'));
}

export async function createSection(courseId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const chapterId = String(formData.get('chapter_id') || '').trim();
  const title = String(formData.get('title') || '').trim();
  if (!chapterId) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('所属チャプターは必須です'));
  if (!title) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('セクション名は必須です'));
  // Insert draft section (lesson)
  const { data: ins, error: insErr } = await supabase
    .from('lessons')
    .insert({ title, course_id: courseId, chapter_id: chapterId, status: 'draft', created_by: user!.id, updated_by: user!.id })
    .select('id')
    .single();
  if (insErr || !ins) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(insErr?.message || '作成に失敗しました'));
  // Resequence section_sort_key within the chapter
  const { data: list } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('chapter_id', chapterId)
    .is('deleted_at', null)
    .order('section_sort_key', { ascending: true });
  const ids = (list || []).map((r: any) => r.id);
  const filtered = ids.filter((id: string) => id !== ins.id);
  filtered.push(ins.id);
  let i = 1;
  for (const id of filtered) {
    await supabase.from('lessons').update({ section_sort_key: i++, updated_at: new Date().toISOString(), updated_by: user!.id }).eq('id', id);
  }
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('セクションを追加しました'));
}

export async function updateCourseStatus(courseId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const status = String(formData.get('status') || '').trim();
  if (!['draft', 'published'].includes(status)) {
    redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent('不正なステータスです'));
  }

  const { data: current, error: getErr } = await supabase
    .from('courses')
    .select('status, version')
    .eq('id', courseId)
    .single();
  if (getErr) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(getErr.message));

  const nowIso = new Date().toISOString();
  let patch: any = { status, updated_at: nowIso, updated_by: user!.id };
  if (current) {
    if (current.status !== 'published' && status === 'published') {
      patch.published_at = nowIso;
      patch.version = (current.version ?? 0) + 1;
    }
    if (current.status === 'published' && status === 'draft') {
      patch.published_at = null;
    }
  }

  const { error: updErr } = await supabase
    .from('courses')
    .update(patch)
    .eq('id', courseId);
  if (updErr) redirect(`/admin/courses/${courseId}?error=` + encodeURIComponent(updErr.message));
  redirect(`/admin/courses/${courseId}?message=` + encodeURIComponent('公開ステータスを更新しました'));
}
