"use client";
import { useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import SidebarItem from './SidebarItem';
import { onShortcut } from '@/lib/shortcuts';

type Props = {
  role: 'user' | 'staff' | 'admin';
  expanded: boolean;
  onExpandToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  mobileRef: React.RefObject<HTMLDivElement>;
};

export default function Sidebar({ role, expanded, onExpandToggle, mobileOpen, onMobileClose, mobileRef }: Props) {
  useEffect(() => {
    const off = onShortcut(['cmd'], (event) => {
      if ((event.key === 'b' || event.key === 'B') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onExpandToggle();
      }
    });
    return off;
  }, [onExpandToggle]);

  const items = useMemo(() => {
    if (role === 'user') {
      return [
        { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
        { href: '/courses', label: 'コース', icon: BookOpen },
        { href: '/test/comfirm', label: '確認テスト', icon: BarChart3 },
        { href: '/settings', label: '設定', icon: Settings },
      ] as const;
    }
    return [
      { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
      { href: '/admin/user', label: 'ユーザー一覧', icon: Users },
      { href: '/admin/courses', label: 'コース管理', icon: BookOpen },
      { href: '/admin/test', label: 'テスト管理', icon: BarChart3 },
      { href: '/settings', label: '設定', icon: Settings },
    ] as const;
  }, [role]);

  return (
    <>
      <aside
        className={[
          'hidden md:fixed md:inset-y-0 md:flex md:flex-col md:border-r md:border-[var(--sidebar-border)] md:bg-[var(--sidebar-bg)] md:text-[var(--muted)] md:shadow-[0_8px_24px_rgba(0,0,0,0.35)] md:transition-[width] md:duration-200 md:ease-out md:motion-reduce:transition-none',
          expanded ? 'md:w-[260px]' : 'md:w-[64px]',
        ].join(' ')}
        aria-label="メインメニュー"
      >
        <div className="flex h-full flex-col px-2 pb-4 pt-[calc(var(--safe-area-top,0px)+12px)]">
          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                showLabel={expanded}
              />
            ))}
          </nav>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onExpandToggle}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:bg-white/10 focus-ring"
              aria-label={expanded ? 'サイドバーを縮める' : 'サイドバーを広げる'}
              aria-pressed={expanded}
            >
              {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </aside>

      <div
        id="mobile-sidebar"
        ref={mobileRef}
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-[var(--panel)] text-[var(--muted)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none md:hidden',
          mobileOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="モバイルメニュー"
      >
        <div className="flex h-full flex-col px-4 pb-[calc(16px+var(--safe-area-bottom,0px))] pt-[calc(16px+var(--safe-area-top,0px))]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">メニュー</span>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[var(--text)] transition hover:bg-white/10 focus-ring"
              onClick={onMobileClose}
              aria-label="メニューを閉じる"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                showLabel
                onSelect={onMobileClose}
              />
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
