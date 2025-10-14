"use client";
import Link from 'next/link';
import Image from 'next/image';
import { CircleHelp, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/icon/zerocode-logo.svg';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Load avatar_url from profiles
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, first_name, last_name')
          .eq('id', user.id)
          .single();
        if (data?.avatar_url) setAvatar(data.avatar_url as string);
        const fn = (data?.first_name as string | null) || '';
        const ln = (data?.last_name as string | null) || '';
        const name = [ln, fn].filter(Boolean).join(' ').trim();
        setFullName(name || user.email || null);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      if (!open) return;
      const el = menuRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-16 bg-[#1E4B9E] border-b border-[#163874]">
      <div className="flex h-full items-center gap-3 px-3 text-white">
        <Link href="/" className="flex items-center text-white">
          <Image src={Logo} alt="zerocode ロゴ" className="h-9 w-auto object-contain" priority />
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <IconButton aria-label="ヘルプ" className="!text-white">
            <CircleHelp size={18} />
          </IconButton>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className={[
                'ml-1 flex items-center gap-2.5 rounded-2xl px-2.5 pr-3 h-10',
                'transition focus-ring'
              ].join(' ')}
              aria-label="ユーザーメニュー"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <div className="h-9 w-9 overflow-hidden rounded-full ring-1 ring-brand-sky/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {avatar ? (
                  <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-brand-sky/40 to-brand/40" />
                )}
              </div>
              {fullName && (
                <span className="hidden sm:inline-block text-sm font-medium text-white max-w-[18ch] truncate" title={fullName}>
                  {fullName}
                </span>
              )}
              <ChevronDown size={16} className={["hidden sm:inline-block opacity-80 transition-transform", open ? 'rotate-180' : ''].join(' ')} />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-brand-sky/20 bg-[color:var(--color-surface)] shadow-lg backdrop-blur p-2 text-sm text-[color:var(--color-text)]">
                <Link href="/settings/profile" className="block rounded-lg px-3 py-2 hover:bg-brand-sky/15">プロフィール</Link>
                <button
                  className="w-full text-left rounded-lg px-3 py-2 hover:bg-brand-sky/15"
                  onClick={async () => {
                    try {
                      const supabase = createClient();
                      await supabase.auth.signOut();
                    } catch {}
                    window.location.href = '/login?message=' + encodeURIComponent('サインアウトしました');
                  }}
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
