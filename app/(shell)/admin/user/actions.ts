"use server";

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/service';

export async function setUserDisabledAction(userId: string, disabled: boolean) {
  const { userId: currentUserId } = await requireRole(['admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  if (userId === currentUserId) {
    throw new Error('自分自身を停止することはできません。');
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('ops_set_user_disabled', {
    target: userId,
    disabled,
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/admin/user');
}

export async function deleteUserAction(userId: string) {
  const { userId: currentUserId } = await requireRole(['admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  if (userId === currentUserId) {
    throw new Error('自分自身を削除することはできません。');
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('ops_delete_user', {
    target: userId,
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/admin/user');
}

export async function inviteOperatorAction(formData: FormData) {
  await requireRole(['admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });

  const rawEmail = String(formData.get('email') || '').trim().toLowerCase();
  const role = String(formData.get('role') || 'staff').trim();
  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    throw new Error('有効なメールアドレスを入力してください。');
  }
  if (!['staff', 'admin'].includes(role)) {
    throw new Error('ロールが不正です。');
  }

  const adminClient = createServerSupabaseAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  const inviteResult = await adminClient.auth.admin.inviteUserByEmail(rawEmail, {
    redirectTo: siteUrl ? `${siteUrl.replace(/\/$/, '')}/ops-onboarding?email=${encodeURIComponent(rawEmail)}` : undefined,
  });
  if (inviteResult.error) {
    throw new Error(inviteResult.error.message);
  }

  const invitedUser = inviteResult.data?.user;
  if (invitedUser?.id) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: invitedUser.id,
        role,
        login_disabled: false,
        onboarding_step: 0,
        onboarding_completed: false,
      });
    if (profileError) {
      throw new Error(profileError.message);
    }
  }

  revalidatePath('/admin/user');
}

export async function createProgressLimitAction(formData: FormData) {
  const { profile } = await requireRole(['staff','admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  const courseId = String(formData.get('course_id') || '').trim();
  const chapterId = String(formData.get('chapter_id') || '').trim();
  const sectionId = String(formData.get('section_id') || '').trim();
  if (!courseId || !chapterId || !sectionId) {
    throw new Error('コース / チャプター / セクションを選択してください。');
  }
  const supabase = createServerSupabaseClient();
  const { data: existing } = await supabase
    .from('progress_limits')
    .select('id')
    .eq('section_id', sectionId)
    .maybeSingle();
  if (existing) {
    throw new Error('このセクションはすでに進捗制限に設定されています。');
  }
  const { error } = await supabase.from('progress_limits').insert({
    course_id: courseId,
    chapter_id: chapterId,
    section_id: sectionId,
    created_by: profile.id,
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/admin/user');
}

export async function deleteProgressLimitAction(limitId: string) {
  await requireRole(['staff','admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('progress_limits').delete().eq('id', limitId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/admin/user');
}

export async function setInterviewTagAction(userId: string, completed: boolean) {
  await requireRole(['staff','admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .update({ interview_completed: completed, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/admin/user');
}

export async function setOpsTagAction(userId: string, tagged: boolean) {
  await requireRole(['admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .update({ ops_tagged: tagged, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    if (String(error.message || '').includes('ops_tagged')) {
      throw new Error('運営タグ用のカラムがまだ作成されていません。最新のDBマイグレーション（ops_tagged追加）を適用してください。');
    }
    throw new Error(error.message);
  }
  revalidatePath('/admin/user');
}
