"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

type Props = {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  showIcon?: boolean;
};

export default function SidebarItem({ href, label, icon: Icon, collapsed, showIcon = true }: Props) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
  const base = 'group flex items-center rounded-xl text-base text-white/90 hover:bg-brand-sky hover:text-brand transition-colors';
  const layout = collapsed ? 'justify-center h-10 w-full' : 'gap-3 px-3 py-2 h-10';
  return (
    <Link
      href={href}
      className={[base, layout, active ? 'bg-brand-sky text-brand' : ''].join(' ')}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
    >
      {showIcon && <Icon className="shrink-0" size={18} />}
      {collapsed ? null : (
        <span className="transition-opacity">{label}</span>
      )}
    </Link>
  );
}
