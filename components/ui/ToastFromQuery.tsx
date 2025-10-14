"use client";
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function ToastFromQuery() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const msg = search.get('message');
    const err = search.get('error');
    if (!msg && !err) return;
    const type = err ? 'error' : 'success';
    const text = (err || msg) as string;
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: decodeURIComponent(text), type } }));
    // Clean the query to avoid repeated toasts on back/forward
    const params = new URLSearchParams(search.toString());
    params.delete('message');
    params.delete('error');
    router.replace(params.toString() ? `${pathname}?${params}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return null;
}

