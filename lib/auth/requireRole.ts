import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient, type Profile, type Role } from '@/lib/supabase/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/service';

const USER_LIFETIME_MS = 21 * 24 * 60 * 60 * 1000; // 3 weeks

async function enforceUserLifetime(profile: Profile, supabase: SupabaseClient) {
  if (profile.role !== 'user') return;
  if (!profile.created_at) return;
  const createdAt = Date.parse(profile.created_at);
  if (!Number.isFinite(createdAt)) return;
  if (Date.now() - createdAt < USER_LIFETIME_MS) return;

  const adminClient = createServerSupabaseAdminClient();
  const result = await adminClient.auth.admin.deleteUser(profile.id);
  if (result.error) {
    console.error('Failed to auto-delete expired user account', result.error);
    throw new Error('アカウントの削除に失敗しました');
  }
  await supabase.auth.signOut();
  redirect('/login?error=expired');
}

function needsOpsOnboarding(profile: Profile): boolean {
  if (profile.role === 'user') return false;
  if (profile.onboarding_completed) return false;
  return (profile.onboarding_step ?? 0) < 5;
}

export async function requireAuth(): Promise<{ userId: string; supabase: SupabaseClient }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { userId: user.id, supabase };
}

async function resolveProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const columnSelection = `
    id,
    role,
    full_name,
    first_name,
    last_name,
    avatar_url,
    phone,
    login_disabled,
    onboarding_step,
    onboarding_completed,
    created_at,
    updated_at
  `;
  const { data, error } = await supabase
    .from('profiles')
    .select(columnSelection)
    .eq('id', userId)
    .single();
  if (!error && data) return data as Profile;

  // Create default profile if not exist (RLS allows only self insert/update if logged-in)
  const { data: upserted, error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' })
    .select(columnSelection)
    .single();
  if (upsertError || !upserted) throw new Error('Failed to create profile');
  return upserted as Profile;
}

export async function requireRole(
  allowed: Role[] = ['user'],
  options?: { redirectTo?: string; signOutOnFail?: boolean; requireOnboardingComplete?: boolean }
): Promise<{ userId: string; profile: Profile }> {
  const { userId, supabase } = await requireAuth();
  const profile = await resolveProfile(supabase, userId);
  await enforceUserLifetime(profile, supabase);
  if (profile.login_disabled) {
    await supabase.auth.signOut();
    redirect('/login?error=suspended');
  }
  if (!allowed.includes(profile.role)) {
    if (options?.signOutOnFail) {
      await supabase.auth.signOut();
    }
    redirect(options?.redirectTo ?? '/login');
  }
  if (options?.requireOnboardingComplete && needsOpsOnboarding(profile)) {
    redirect('/ops-onboarding');
  }
  return { userId, profile };
}

export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const supabase = createServerSupabaseClient();
  return resolveProfile(supabase, userId);
}
