import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createServerSupabaseClient(): SupabaseClient {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // In RSC, cookie mutation is not allowed; ignore errors outside Server Actions/Route Handlers
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          // In RSC, cookie mutation is not allowed; ignore errors outside Server Actions/Route Handlers
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {}
        },
      },
    }
  );
  return supabase as unknown as SupabaseClient;
}

export type Role = 'user' | 'staff' | 'admin';
export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  login_disabled?: boolean | null;
  onboarding_step?: number | null;
  onboarding_completed?: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};
