export function onShortcut(keys: string[], handler: (e: KeyboardEvent) => void) {
  function match(e: KeyboardEvent) {
    const map = new Set(keys.map((k) => k.toLowerCase()));
    const cmd = e.metaKey || false;
    const ctrl = e.ctrlKey || false;
    for (const key of map) {
      if (key === 'cmd' && !cmd) return false;
      if (key === 'ctrl' && !ctrl) return false;
    }
    return true;
  }
  const listener = (e: KeyboardEvent) => {
    if (match(e)) handler(e);
  };
  window.addEventListener('keydown', listener);
  return () => window.removeEventListener('keydown', listener);
}

