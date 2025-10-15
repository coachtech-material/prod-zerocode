import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient, type Profile, type Role } from '@/lib/supabase/server';

export async function requireAuth(): Promise<{ userId: string; supabase: SupabaseClient }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { userId: user.id, supabase };
}

async function getOrCreateProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
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
  options?: { redirectTo?: string; signOutOnFail?: boolean }
): Promise<{ userId: string; profile: Profile }> {
  const { userId, supabase } = await requireAuth();
  const profile = await getOrCreateProfile(supabase, userId);
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
  return { userId, profile };
}
