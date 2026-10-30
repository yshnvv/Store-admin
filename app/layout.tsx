import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ozon ↔ FazerCards Binding',
  description: 'Bind Ozon products to FazerCards articles',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
