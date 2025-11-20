"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Menu, CircleHelp } from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/icon/zerocode-logo.svg';

type HeaderProps = {
  mobileSidebarOpen: boolean;
  onMobileSidebarToggle: () => void;
  sidebarToggleRef: React.RefObject<HTMLButtonElement>;
};

type MenuItem = {
  key: string;
  label: string;
  description?: string;
  action: () => Promise<void> | void;
};

export default function Header({
  mobileSidebarOpen,
  onMobileSidebarToggle,
  sidebarToggleRef,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
      } catch {
        // no-op
      }
    })();
  }, []);

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        key: 'profile',
        label: 'プロフィール',
        description: 'アカウントの基本情報を確認・変更',
        action: () => {
          setMenuOpen(false);
          window.location.href = '/settings/profile';
        },
      },
      {
        key: 'logout',
        label: 'ログアウト',
        description: 'zerocode からサインアウト',
        action: async () => {
          setMenuOpen(false);
          const supabase = createClient();
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
          window.location.href = '/login?message=' + encodeURIComponent('サインアウトしました');
        },
      },
    ],
    []
  );

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!menuRef.current) return;
      if (target instanceof Node && menuRef.current.contains(target)) return;
      if (target instanceof Node && avatarButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        requestAnimationFrame(() => avatarButtonRef.current?.focus());
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    itemRefs.current = [];
    setActiveIndex(0);
    requestAnimationFrame(() => {
      menuRef.current?.focus();
      itemRefs.current[0]?.focus();
    });
  }, [menuOpen]);

  const handleMenuKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!menuOpen) return;
    const total = menuItems.length;
    if (total === 0) return;
    const currentIndex = activeIndex;
    const focusItem = (index: number) => {
      const normalized = (index + total) % total;
      setActiveIndex(normalized);
      itemRefs.current[normalized]?.focus();
    };

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(currentIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(total - 1);
        break;
      case 'Tab':
        setMenuOpen(false);
        break;
      default:
        break;
    }
  };

  const setItemRef = (index: number) => (node: HTMLAnchorElement | HTMLButtonElement | null) => {
    itemRefs.current[index] = node;
  };

  const iconButtonClass =
    'inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-[var(--text)] transition hover:bg-white/10 focus-ring';

  return (
    <header
      className="sticky top-0 z-50 flex h-14 items-center bg-[#0d2438]/80 px-4 text-[var(--muted)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur md:px-6 lg:px-8"
      style={{ paddingTop: 'var(--safe-area-top, 0px)' }}
    >
      <div className="flex w-full items-center gap-3 overflow-hidden">
        <button
          ref={sidebarToggleRef}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-[var(--text)] transition hover:bg-white/10 focus-ring md:hidden"
          aria-label={mobileSidebarOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={mobileSidebarOpen}
          aria-controls="mobile-sidebar"
          onClick={onMobileSidebarToggle}
        >
          <Menu size={20} />
        </button>
        <Link href="/" className="flex items-center gap-2 text-[var(--text)]">
          <Image src={Logo} alt="zerocode ロゴ" className="h-8 w-auto object-contain" priority />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button type="button" className={iconButtonClass} aria-label="ヘルプセンター">
            <CircleHelp size={18} />
          </button>
          <div className="relative">
            <button
              ref={avatarButtonRef}
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-11 items-center gap-3 rounded-2xl bg-white/5 px-2.5 pr-3 text-[var(--text)] transition hover:bg-white/10 focus-ring"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
            >
              <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-[#103a5d]">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="プロフィール画像" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#1f6feb]/40 via-[#58a6ff]/10 to-[#1f6feb]/40" />
                )}
              </div>
              {fullName && (
                <span className="hidden max-w-[22ch] truncate text-[15px] font-medium md:inline">{fullName}</span>
              )}
            </button>

            {menuOpen && (
              <div
                id={menuId}
                ref={menuRef}
                role="menu"
                tabIndex={-1}
                onKeyDown={handleMenuKey}
                className="absolute right-0 mt-3 w-72 max-h-[70vh] overflow-y-auto rounded-2xl bg-[var(--panel)] p-2 text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/10 focus:outline-none"
              >
                <div className="divide-y divide-white/5">
                  {menuItems.map((item, index) => (
                    <button
                      key={item.key}
                      ref={setItemRef(index)}
                      type="button"
                      role="menuitem"
                      className={[
                        'flex h-12 w-full flex-col items-start justify-center rounded-xl px-4 text-left text-[15px] transition',
                        index === activeIndex ? 'bg-white/10 text-[var(--text)]' : 'hover:bg-white/5',
                      ].join(' ')}
                      onClick={() => {
                        setActiveIndex(index);
                        void item.action();
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="font-medium">{item.label}</span>
                      {item.description && <span className="text-xs text-[var(--muted)]">{item.description}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
