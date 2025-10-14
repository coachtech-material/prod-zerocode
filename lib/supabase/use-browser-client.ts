"use client";

import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSupabaseBrowserClient() {
  return useMemo(() => createClient(), []);
}
