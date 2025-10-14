import '../styles/globals.css';
import Toaster from '@/components/ui/Toaster';

export const metadata = {
  title: 'zerocode',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
