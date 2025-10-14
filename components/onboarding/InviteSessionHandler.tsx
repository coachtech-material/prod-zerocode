"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function parseHash(): { access_token?: string; refresh_token?: string } {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return {};
  const params = new URLSearchParams(hash.substring(1));
  return {
    access_token: params.get('access_token') || undefined,
    refresh_token: params.get('refresh_token') || undefined,
  };
}

export default function InviteSessionHandler({ redirectPath }: { redirectPath: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const { access_token, refresh_token } = parseHash();
    if (access_token && refresh_token) {
      (async () => {
        await supabase.auth.setSession({ access_token, refresh_token });
        const url = new URL(window.location.href);
        url.hash = '';
        router.replace(redirectPath + url.search);
        router.refresh();
      })();
    }
  }, [router, redirectPath]);

  return null;
}
