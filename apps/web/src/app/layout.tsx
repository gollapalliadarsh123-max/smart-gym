import type { Metadata } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import { APP_DESCRIPTION, APP_NAME } from '@smart-gym/shared';
import { AppProviders } from '@/components/providers/app-providers';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
