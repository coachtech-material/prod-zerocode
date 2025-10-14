"use server";

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/onboarding/validators';
import type { OpsOnboardingState } from './state';

export async function completeOpsOnboarding(
  _prevState: OpsOnboardingState,
  formData: FormData,
): Promise<OpsOnboardingState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'セッションが無効です。招待メールから再度アクセスしてください。' };
  }

  let password: string;
  let confirm: string;

  try {
    password = validatePassword(String(formData.get('password') || ''), 'パスワード');
    confirm = validatePassword(String(formData.get('confirm') || ''), 'パスワード（確認）');
  } catch (error: any) {
    return { error: error?.message ?? '入力内容を確認してください。' };
  }

  if (password !== confirm) {
    return { error: 'パスワードが一致していません。' };
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    return { error: passwordError.message };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      login_disabled: false,
      onboarding_step: 5,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  redirect('/admin?welcome=1');
}
