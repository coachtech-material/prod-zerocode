"use client";

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

function parseHash(): { access_token?: string; refresh_token?: string } {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return {};
  const params = new URLSearchParams(hash.substring(1));
  const access_token = params.get('access_token') || undefined;
  const refresh_token = params.get('refresh_token') || undefined;
  return { access_token, refresh_token };
}

export default function VerificationWatcher({ formId }: { formId: string }) {
  const submittedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let interval: ReturnType<typeof setInterval> | undefined;

    const submit = () => {
      if (submittedRef.current) return;
      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (form) {
        submittedRef.current = true;
        form.requestSubmit();
        if (interval) clearInterval(interval);
      }
    };

    const { access_token, refresh_token } = parseHash();
    if (access_token && refresh_token) {
      (async () => {
        await supabase.auth.setSession({ access_token, refresh_token });
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        submit();
      })();
    }

    interval = setInterval(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        submit();
      }
    }, 5000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [formId]);

  return null;
}
