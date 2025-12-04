"use server";

import { redirect } from 'next/navigation';
import { createServerSupabaseClient, type Role } from '@/lib/supabase/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/service';

type PasswordSignInOptions = {
  formData: FormData;
  allowedRoles: Role[];
  successRedirect: string;
  failureRedirect: string;
  invalidCredentialsMessage: string;
  unauthorizedMessage: string;
  createProfileIfMissing?: boolean;
  defaultRole?: Role;
  formatUnauthorizedMessage?: (role: Role | undefined) => string;
};

async function updateLastActiveAt(userId: string) {
  const adminClient = createServerSupabaseAdminClient();
  try {
    await adminClient
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    console.error('Failed to update last_active_at', error);
  }
}

async function resolveUserRole(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  options: { createProfileIfMissing?: boolean; defaultRole?: Role }
): Promise<Role | undefined> {
  const { createProfileIfMissing, defaultRole = 'user' } = options;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('Failed to load profile role', profileError);
  }

  let role = profile?.role as Role | undefined;

  if (!role && createProfileIfMissing) {
    const adminClient = createServerSupabaseAdminClient();
    const { data: upserted, error: upsertError } = await adminClient
      .from('profiles')
      .upsert({ id: userId, role: defaultRole }, { onConflict: 'id' })
      .select('role')
      .single();

    if (upsertError) {
      console.error('Failed to upsert user profile', upsertError);
      role = defaultRole;
    } else {
      role = (upserted?.role as Role | undefined) ?? defaultRole;
    }
  }

  return role ?? defaultRole;
}

async function handlePasswordSignIn(options: PasswordSignInOptions) {
  const {
    formData,
    allowedRoles,
    successRedirect,
    failureRedirect,
    invalidCredentialsMessage,
    unauthorizedMessage,
    createProfileIfMissing,
    defaultRole,
    formatUnauthorizedMessage,
  } = options;

  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  const failure = (message: string) => {
    redirect(`${failureRedirect}?error=${encodeURIComponent(message)}`);
  };

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    failure(`${invalidCredentialsMessage}: ${error.message}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
  if (!userId) {
    failure('ログインセッションを確立できませんでした');
  }

  const role = await resolveUserRole(supabase, userId!, {
    createProfileIfMissing,
    defaultRole,
  });

  if (!role || !allowedRoles.includes(role)) {
    await supabase.auth.signOut();
    const message = formatUnauthorizedMessage ? formatUnauthorizedMessage(role) : unauthorizedMessage;
    failure(message);
  }

  await updateLastActiveAt(userId!);

  redirect(successRedirect);
}

export async function signIn(formData: FormData) {
  await handlePasswordSignIn({
    formData,
    allowedRoles: ['user'],
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    invalidCredentialsMessage: 'メールアドレスまたはパスワードが正しくありません',
    unauthorizedMessage: 'このアカウントではログインできません',
    createProfileIfMissing: true,
    defaultRole: 'user',
    formatUnauthorizedMessage: (role) =>
      `このアカウントは「${role ?? '未設定'}」ロールのためユーザー用ログインを利用できません`,
  });
}

export async function signUp(formData: FormData) {
  if (process.env.ALLOW_SIGNUP?.toLowerCase() === 'false') {
    redirect('/login?error=' + encodeURIComponent('Sign up is disabled'));
  }
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  // If confirmation is disabled and we got a session, send to dashboard. Otherwise, ask to check email.
  if (data.session) {
    try {
      const uid = data.session.user.id;
      const adminClient = createServerSupabaseAdminClient();
      await adminClient.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', uid);
    } catch {}
    redirect('/dashboard');
  } else {
    redirect('/login?message=' + encodeURIComponent('Check your email to confirm'));
  }
}

export async function signOut() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function signInOps(formData: FormData) {
  await handlePasswordSignIn({
    formData,
    allowedRoles: ['staff', 'admin'],
    successRedirect: '/admin',
    failureRedirect: '/ops-login',
    invalidCredentialsMessage: 'メールアドレスまたはパスワードが正しくありません',
    unauthorizedMessage: '運営専用ログインです（staff/admin のみ）',
    createProfileIfMissing: true,
    defaultRole: 'user',
  });
}
