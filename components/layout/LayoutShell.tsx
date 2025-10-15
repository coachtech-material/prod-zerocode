"use client";
import { useCallback, useEffect, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function LayoutShell({ role, children }: { role: 'user' | 'staff' | 'admin'; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  useEffect(() => {
    const raw = localStorage.getItem('sidebar:collapsed');
    if (raw != null) setCollapsed(raw === 'true');
  }, []);
  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const nv = !v;
      localStorage.setItem('sidebar:collapsed', String(nv));
      return nv;
    });
  }, []);

  return (
    <div>
      <Header />
      <Sidebar role={role} collapsed={collapsed} onToggle={toggle} />
      <main
        data-scroll-container="layout-shell-main"
        className={[
          'fixed right-0 bottom-0 top-16 overflow-y-auto p-6 bg-[color:var(--color-content-background)] text-[color:var(--text)] backdrop-blur-sm border-l border-[color:var(--line)]',
          collapsed ? 'left-16' : 'left-60',
        ].join(' ')}
      >
        {children}
      </main>
    </div>
  );
}
