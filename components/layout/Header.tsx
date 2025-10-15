"use client";
import Link from 'next/link';
import Image from 'next/image';
import { CircleHelp, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/icon/zerocode-logo.svg';
import ThemeToggle from '@/components/theme/ThemeToggle';

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
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-[color:var(--line-strong)] bg-[color:var(--header-bg)] backdrop-blur-sm">
      <div className="flex h-full items-center gap-3 px-3 text-[color:var(--text)]">
        <Link href="/" className="flex items-center text-[color:var(--text)]">
          <Image src={Logo} alt="zerocode ロゴ" className="h-9 w-auto object-contain" priority />
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <IconButton aria-label="ヘルプ" variant="ghost">
            <CircleHelp size={18} />
          </IconButton>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className={[
                'ml-1 flex h-10 items-center gap-2.5 rounded-2xl px-2.5 pr-3 transition focus-ring',
                'bg-[color:var(--nav-icon-bg)] text-[color:var(--nav-icon-foreground)] hover:bg-[color:var(--nav-icon-hover)]',
              ].join(' ')}
              aria-label="ユーザーメニュー"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <div className="h-9 w-9 overflow-hidden rounded-full ring-1" style={{ borderColor: 'var(--line)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {avatar ? (
                  <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-brand/25 via-brand/10 to-brand/40" />
                )}
              </div>
              {fullName && (
                <span className="hidden max-w-[18ch] truncate text-sm font-medium sm:inline-block" title={fullName}>
                  {fullName}
                </span>
              )}
              <ChevronDown size={16} className={["hidden sm:inline-block opacity-80 transition-transform", open ? 'rotate-180' : ''].join(' ')} />
            </button>
            {open && (
              <div className="surface-menu absolute right-0 mt-2 w-48 rounded-2xl border border-[color:var(--line)] p-2 text-sm text-[color:var(--text)]">
                <Link href="/settings/profile" className="block rounded-xl px-3 py-2 hover:bg-[color:var(--sidebar-hover)]">プロフィール</Link>
                <button
                  className="w-full text-left rounded-xl px-3 py-2 hover:bg-[color:var(--sidebar-hover)]"
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
