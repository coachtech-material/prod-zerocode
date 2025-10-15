"use client";
import { useEffect, useMemo } from 'react';
import SidebarItem from './SidebarItem';
import { LayoutDashboard, Users, BookOpen, BarChart3, Settings, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { onShortcut } from '@/lib/shortcuts';

type Props = {
  role: 'user' | 'staff' | 'admin';
  collapsed: boolean;
  onToggle: () => void;
};

export default function Sidebar({ role, collapsed, onToggle }: Props) {
  useEffect(() => {
    const off = onShortcut(['cmd'], (e) => {
      if ((e.key === 'b' || e.key === 'B') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onToggle();
      }
    });
    return off;
  }, [onToggle]);

  const items = useMemo(() => {
    if (role === 'user') {
      return [
        { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
        { href: '/courses', label: 'コース', icon: BookOpen },
        { href: '/test/comfirm', label: '確認テスト', icon: BarChart3 },
        { href: '/interview', label: '面談予約', icon: CalendarClock },
        { href: '/settings', label: '設定', icon: Settings },
      ];
    }
    // staff/admin: 管理メニューに誘導
    return [
      { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
      { href: '/admin/user', label: 'ユーザー一覧', icon: Users },
      { href: '/admin/courses', label: 'コース管理', icon: BookOpen },
      { href: '/admin/test', label: 'テスト管理', icon: BarChart3 },
      { href: '/settings', label: '設定', icon: Settings },
    ];
  }, [role]);

  return (
    <aside
      className={[
        'fixed left-0 top-16 bottom-0 z-40 border-r border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-bg)] text-[#C3C7CC] transition-[width] duration-300 ease-in-out shadow-[var(--shadow-1)]',
        collapsed ? 'w-16' : 'w-60',
      ].join(' ')}
    >
      <div className="flex h-full flex-col gap-2 p-2">
        <nav className="flex-1 space-y-1">
          {items.map((it) => (
            <SidebarItem
              key={it.href}
              href={it.href}
              label={it.label}
              icon={it.icon}
              collapsed={collapsed}
              showIcon={true}
            />
          ))}
        </nav>
        <button
          onClick={onToggle}
          className={[
            'mb-1 flex h-10 w-full items-center rounded-xl bg-[color:var(--nav-icon-bg)] text-[color:var(--nav-icon-foreground)] hover:bg-[color:var(--nav-icon-hover)] focus-ring',
            collapsed ? 'justify-center' : 'justify-center gap-2 px-3',
          ].join(' ')}
          aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
          title="⌘/Ctrl + B で切替"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-sm">サイドバーを閉じる</span>}
        </button>
      </div>
    </aside>
  );
}
