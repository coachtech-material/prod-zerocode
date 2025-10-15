import '../styles/globals.css';
import Script from 'next/script';
import Toaster from '@/components/ui/Toaster';

export const metadata = {
  title: 'zerocode',
};

const themeInitScript = `(() => {
  const storageKey = 'theme';
  try {
    const root = document.documentElement;
    const stored = window.localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored ?? (prefersDark ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  } catch (error) {
    console.warn('Failed to initialize theme', error);
  }
})();`;

const SUPABASE_ORIGIN = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {SUPABASE_ORIGIN ? <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="" /> : null}
      </head>
      <body className="min-h-screen antialiased bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent)]/30 text-[14px] leading-[22px]">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
