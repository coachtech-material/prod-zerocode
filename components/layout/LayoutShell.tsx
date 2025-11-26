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
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartTimeRef = useRef<number>(0);
  const lastWheelSwipeRef = useRef<number>(0);

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
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
    };
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

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      swipeStartXRef.current = event.touches[0].clientX;
      swipeStartTimeRef.current = Date.now();
    };
    const handleTouchEnd = (event: TouchEvent) => {
      if (swipeStartXRef.current == null) return;
      const deltaX = event.changedTouches[0].clientX - swipeStartXRef.current;
      const duration = Date.now() - swipeStartTimeRef.current;
      swipeStartXRef.current = null;
      swipeStartTimeRef.current = 0;
      const absX = Math.abs(deltaX);
      if (absX < 80 || duration > 500) return;
      if (deltaX > 0) {
        window.history.back();
      } else {
        window.history.forward();
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) < 120) return;
      if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
      const now = Date.now();
      if (now - lastWheelSwipeRef.current < 800) return;
      lastWheelSwipeRef.current = now;
      if (event.deltaX > 0) {
        window.history.forward();
      } else {
        window.history.back();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const mainPaddingClass = useMemo(() => (sidebarExpanded ? 'md:pl-64' : 'md:pl-14'), [sidebarExpanded]);

  return (
    <div className="fixed inset-0 flex w-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
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
      <div className={['flex h-full min-h-0 flex-1 flex-col', mainPaddingClass].join(' ')}>
        <Header
          mobileSidebarOpen={mobileSidebarOpen}
          onMobileSidebarToggle={mobileSidebarOpen ? closeMobileSidebar : openMobileSidebar}
          sidebarToggleRef={sidebarToggleRef}
        />
        <main
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-[calc(24px+var(--safe-area-bottom,0px))] sm:px-5 md:px-6 lg:px-8"
          style={{ paddingTop: 'calc(56px + var(--safe-area-top, 0px))' }}
          data-scroll-container="layout-shell-main"
        >
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
