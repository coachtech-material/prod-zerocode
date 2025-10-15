import '../styles/globals.css';
import Script from 'next/script';
import Toaster from '@/components/ui/Toaster';

export const metadata = {
  title: 'zerocode',
};

export const dynamic = 'force-dynamic';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
