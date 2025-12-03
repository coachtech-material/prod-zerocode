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
