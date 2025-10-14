import { useLayoutEffect } from 'react';

type ScrollTarget = () => HTMLElement | null;

/**
 * Locks scrolling on the provided target (defaults to document.body) while `active` is true.
 * Restores the previous scroll position and styles when unlocked.
 */
export function useScrollLock(active: boolean, getTarget: ScrollTarget = () => (typeof document !== 'undefined' ? document.body : null)) {
  useLayoutEffect(() => {
    if (!active) return;
    const target = getTarget();
    if (!target) return;

    const doc = typeof document !== 'undefined' ? document : null;
    const isBody = doc ? target === doc.body || target === doc.documentElement : false;
    const scrollY = typeof window !== 'undefined' && isBody ? window.scrollY || window.pageYOffset : target.scrollTop;

    const { style } = target;
    const original = {
      position: style.position,
      top: style.top,
      overflow: style.overflow,
      left: style.left,
      right: style.right,
      width: style.width,
    };

    if (isBody) {
      style.position = 'fixed';
      style.top = `-${scrollY}px`;
      style.left = '0';
      style.right = '0';
      style.width = '100%';
    }
    style.overflow = 'hidden';

    return () => {
      style.position = original.position;
      style.top = original.top;
      style.left = original.left;
      style.right = original.right;
      style.width = original.width;
      style.overflow = original.overflow;

      if (isBody && typeof window !== 'undefined') {
        const restoreY = scrollY || 0;
        window.scrollTo(0, restoreY);
      } else if (!isBody) {
        target.scrollTop = scrollY || 0;
      }
    };
  }, [active, getTarget]);
}
