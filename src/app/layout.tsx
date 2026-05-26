import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DivisasBO — Simulador de Mercado de Divisas',
  description: 'Plataforma educativa de trading de divisas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
