import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KONO | Mapa Regionów Handlowych',
  description: 'Wewnętrzna mapa przypisania regionów dla dyrektora handlowego KONO'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className="dark">
      <body>{children}</body>
    </html>
  );
}
