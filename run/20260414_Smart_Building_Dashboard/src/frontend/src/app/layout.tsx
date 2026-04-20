import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'INTEGRA — Smart Building Super App',
  description:
    'Platform Operasional Gedung Terintegrasi untuk Data Center, Office, dan Hospitality.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
