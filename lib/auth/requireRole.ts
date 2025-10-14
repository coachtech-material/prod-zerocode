import { redirect } from 'next/navigation';
import { createServerSupabaseClient, type Profile, type Role } from '@/lib/supabase/server';

export async function requireAuth(): Promise<{ userId: string }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { userId: user.id };
}

export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (!error && data) return data as Profile;

  // Create default profile if not exist (RLS allows only self insert/update if logged-in)
  const { data: upserted, error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' })
    .select()
    .single();
  if (upsertError || !upserted) throw new Error('Failed to create profile');
  return upserted as Profile;
}

export async function requireRole(
  allowed: Role[] = ['user'],
  options?: { redirectTo?: string; signOutOnFail?: boolean }
): Promise<{ userId: string; profile: Profile }> {
  const { userId } = await requireAuth();
  const profile = await getOrCreateProfile(userId);
  if (profile.login_disabled) {
    const supabase = createServerSupabaseClient();
    await supabase.auth.signOut();
    redirect('/login?error=suspended');
  }
  if (!allowed.includes(profile.role)) {
    if (options?.signOutOnFail) {
      const supabase = createServerSupabaseClient();
      await supabase.auth.signOut();
    }
    redirect(options?.redirectTo ?? '/login');
  }
  return { userId, profile };
}
