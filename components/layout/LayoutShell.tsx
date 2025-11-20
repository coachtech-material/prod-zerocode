"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const STORAGE_KEY = 'sidebar:expanded';

export default function LayoutShell({ role, children }: { role: 'user' | 'staff' | 'admin'; children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarMobileRef = useRef<HTMLDivElement | null>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored != null) {
      setSidebarExpanded(stored === 'true');
      return;
    }
    // legacy key fallback
    const legacy = localStorage.getItem('sidebar:collapsed');
    if (legacy != null) {
      const expanded = legacy !== 'true';
      setSidebarExpanded(expanded);
      localStorage.setItem(STORAGE_KEY, String(expanded));
      return;
    }
    if (typeof window !== 'undefined') {
      const prefersExpanded = window.matchMedia('(min-width: 640px)').matches;
      setSidebarExpanded(prefersExpanded);
    }
  }, []);

  const toggleSidebarExpanded = useCallback(() => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
    requestAnimationFrame(() => {
      sidebarToggleRef.current?.focus();
    });
  }, []);

  const openMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const root = sidebarMobileRef.current;
    if (!root) return;

    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    const first = focusable[0] ?? root;
    requestAnimationFrame(() => {
      first.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileSidebar();
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const current = document.activeElement as HTMLElement | null;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (current === firstEl || !focusable.includes(current as HTMLElement)) {
          event.preventDefault();
          lastEl.focus();
        }
      } else if (current === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    const handleResize = () => {
      if (window.matchMedia('(min-width: 640px)').matches) {
        setMobileSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [closeMobileSidebar, mobileSidebarOpen]);

  const mainPaddingClass = useMemo(() => (sidebarExpanded ? 'md:pl-64' : 'md:pl-14'), [sidebarExpanded]);

  return (
    <div className="flex min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      {mobileSidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ease-out md:hidden motion-reduce:transition-none"
          onClick={closeMobileSidebar}
        />
      )}
      <Sidebar
        role={role}
        expanded={sidebarExpanded}
        onExpandToggle={toggleSidebarExpanded}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
        mobileRef={sidebarMobileRef}
      />
      <div className={['flex min-h-screen flex-1 flex-col', mainPaddingClass].join(' ')}>
        <Header
          mobileSidebarOpen={mobileSidebarOpen}
          onMobileSidebarToggle={mobileSidebarOpen ? closeMobileSidebar : openMobileSidebar}
          sidebarToggleRef={sidebarToggleRef}
        />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-[calc(24px+var(--safe-area-bottom,0px))] sm:px-5 md:px-6 lg:px-8"
          style={{ paddingTop: 'calc(56px + var(--safe-area-top, 0px))' }}
          data-scroll-container="layout-shell-main"
        >
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
