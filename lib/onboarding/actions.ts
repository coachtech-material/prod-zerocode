"use server";

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/service';
import { validatePassword as validatePasswordField } from '@/lib/onboarding/validators';
import { readOnboardingState, updateOnboardingState, clearOnboardingState } from '@/lib/onboarding/state';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_INTERVAL_MS = 60 * 1000;

function getOrigin() {
  const hdr = headers();
  return hdr.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
}

export async function submitOnboardingEmail(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    redirect('/register/email?error=' + encodeURIComponent('メールアドレスの形式が正しくありません'));
  }

  const supabase = createServerSupabaseClient();
  const origin = getOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: origin ? `${origin}/register/verify` : undefined,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect('/register/email?error=' + encodeURIComponent(error.message));
  }

  const nowIso = new Date().toISOString();
  updateOnboardingState({ email, step: 2, lastEmailSentAt: nowIso });
  redirect('/register/verify?sent=1');
}

export async function resendOnboardingEmail() {
  const state = readOnboardingState();
  if (!state.email) {
    redirect('/register/email');
  }
  if (state.lastEmailSentAt) {
    const diff = Date.now() - new Date(state.lastEmailSentAt).getTime();
    if (diff < RESEND_INTERVAL_MS) {
      redirect('/register/verify?error=' + encodeURIComponent('短時間に複数回の再送はできません。しばらくしてからお試しください'));
    }
  }
  const supabase = createServerSupabaseClient();
  const origin = getOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email: state.email!,
    options: {
      emailRedirectTo: origin ? `${origin}/register/verify` : undefined,
      shouldCreateUser: true,
    },
  });
  if (error) {
    redirect('/register/verify?error=' + encodeURIComponent(error.message));
  }
  updateOnboardingState({ step: Math.max(state.step ?? 2, 2), lastEmailSentAt: new Date().toISOString() });
  redirect('/register/verify?resent=1');
}

export async function markEmailVerified() {
  const supabase = createServerSupabaseClient();
  const adminClient = createServerSupabaseAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('Failed to load auth user during onboarding verification', userError);
    redirect('/register/verify?error=' + encodeURIComponent('ログイン状態を確認してください'));
  }
  const user = userData?.user;
  if (!user) {
    redirect('/register/verify?error=' + encodeURIComponent('メール認証が完了していません'));
  }

  updateOnboardingState({ step: 3, verifiedAt: new Date().toISOString() });

  const { error: upsertError } = await adminClient.from('profiles').upsert({ id: user.id }, { onConflict: 'id' });
  if (upsertError) {
    console.error('Failed to upsert onboarding profile', upsertError);
    redirect('/register/verify?error=' + encodeURIComponent('プロフィール情報の更新に失敗しました。もう一度お試しください。'));
  }

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ onboarding_step: 2 })
    .eq('id', user.id);
  if (updateError) {
    console.error('Failed to update onboarding step', updateError);
    redirect('/register/verify?error=' + encodeURIComponent('プロフィール情報の更新に失敗しました。もう一度お試しください。'));
  }

  redirect('/register/password');
}

export async function setOnboardingPassword(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const adminClient = createServerSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/register/email');
  }

  let password: string;
  let confirm: string;
  try {
    password = validatePasswordField(String(formData.get('password') || ''));
    confirm = validatePasswordField(String(formData.get('confirm') || ''));
  } catch (error: any) {
    redirect('/register/password?error=' + encodeURIComponent(error.message ?? '入力内容を確認してください'));
  }

  if (password !== confirm) {
    redirect('/register/password?error=' + encodeURIComponent('パスワードが一致していません'));
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect('/register/password?error=' + encodeURIComponent(error.message));
  }

  await adminClient
    .from('profiles')
    .update({ onboarding_step: 3 })
    .eq('id', user.id);

  updateOnboardingState({ step: 4 });
  redirect('/register/profile');
}

function validateName(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new Error(`${label}は必須です`);
  }
  const kanjiRegex = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー・]+$/u;
  if (!kanjiRegex.test(trimmed)) {
    throw new Error(`${label}は漢字で入力してください`);
  }
  if (trimmed.length > 50) {
    throw new Error(`${label}が長すぎます`);
  }
  return trimmed;
}

function validatePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new Error('電話番号は必須です');
  }
  const digits = trimmed.replace(/[\s-]/g, '');
  if (!/^[0-9]{10,11}$/.test(digits)) {
    throw new Error('電話番号はハイフン無しの10桁または11桁で入力してください');
  }
  return digits;
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function completeOnboardingProfile(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const adminClient = createServerSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/register/email');
  }

  let firstName: string;
  let lastName: string;
  let phone: string;
  try {
    firstName = validateName(String(formData.get('first_name') || ''), '名');
    lastName = validateName(String(formData.get('last_name') || ''), '姓');
    phone = validatePhone(String(formData.get('phone') || ''));
  } catch (error: any) {
    redirect('/register/profile?error=' + encodeURIComponent(error.message || '入力内容を確認してください'));
  }

  let avatarUrl: string | undefined;
  const file = formData.get('avatar') as File | null;
  if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      redirect('/register/profile?error=' + encodeURIComponent('対応していないファイル形式です'));
    }
    if (file.size > MAX_AVATAR_BYTES) {
      redirect('/register/profile?error=' + encodeURIComponent('ファイルサイズは5MB以下にしてください'));
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split('/')[1] || 'png';
    const path = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, buf, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (error) {
      redirect('/register/profile?error=' + encodeURIComponent('画像の保存に失敗しました: ' + error.message));
    }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    avatarUrl = pub.publicUrl;
  }

  const update: Record<string, any> = {
    first_name: firstName,
    last_name: lastName,
    full_name: `${lastName}${firstName}`,
    phone,
    onboarding_step: 4,
    onboarding_completed: true,
  };
  if (avatarUrl) update.avatar_url = avatarUrl;
  const { error: upErr } = await adminClient.from('profiles').upsert({ id: user.id, ...update }, { onConflict: 'id' });
  if (upErr) {
    redirect('/register/profile?error=' + encodeURIComponent(upErr.message));
  }

  updateOnboardingState({ step: 5 });
  redirect('/register/done');
}

export async function clearOnboardingProgress() {
  clearOnboardingState();
}

export async function startOnboarding() {
  updateOnboardingState({ step: 1, email: undefined, lastEmailSentAt: undefined, verifiedAt: undefined });
  redirect('/register/email');
}
