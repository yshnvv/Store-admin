import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import AuthBar from './auth-bar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ozon ↔ FazerCards Binding',
  description: 'Bind Ozon products to FazerCards articles',
};

function getRoleFromCookie(): 'admin' | 'manager' | null {
  const cookieStore = cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (!session) return null;
  try {
    const decoded = Buffer.from(session, 'base64').toString('utf-8');
    const [user, pass, role = 'manager'] = decoded.split(':');
    const ADMIN_USER = process.env.ADMIN_USER ?? 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS ?? 'admin';
    const MANAGER_USER = process.env.MANAGER_USER ?? 'manager';
    const MANAGER_PASS = process.env.MANAGER_PASS ?? 'manager';
    if (user === ADMIN_USER && pass === ADMIN_PASS) return 'admin';
    if (user === MANAGER_USER && pass === MANAGER_PASS) return 'manager';
    return null;
  } catch {
    return null;
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = getRoleFromCookie();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {role && (
          <nav className="sticky top-0 z-20 bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
              <Link href="/" className="font-bold text-ozon-600 text-lg">
                Ozon ↔ FazerCards
              </Link>
              <Link
                href="/"
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-100 text-gray-700"
              >
                Bindings
              </Link>
              {role === 'admin' && (
                <>
                  <Link
                    href="/stock"
                    className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                  >
                    Stock sync
                  </Link>
                  <Link
                    href="/key-buy"
                    className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                  >
                    Key-buy cron
                  </Link>
                  <Link
                    href="/fulfillment"
                    className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                  >
                    Digital fulfillment
                  </Link>
                </>
              )}
              <div className="ml-auto text-xs text-gray-500">
                API: {process.env.NEXT_PUBLIC_API_BASE ?? '(relative)'}
                &nbsp;|&nbsp; Role: {role}
              </div>
              <AuthBar />
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
