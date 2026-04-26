import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { SolanaProviders } from '@/components/providers/SolanaProviders';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://solana.rootrecord.info';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'RootRecord Solana Tools | Cheapest Token Creator on Solana',
    template: '%s | RootRecord Solana Tools',
  },
  description:
    'Fast, cheap, on-chain SPL token creation that respects your SOL. Create, revoke authorities, mint more, and update metadata for ~half the price of every other Solana token tool.',
  keywords: [
    'Solana',
    'SPL token',
    'token creator',
    'memecoin',
    'cheapest solana token creator',
    'revoke mint authority',
    'metaplex',
    'rootrecord',
  ],
  openGraph: {
    title: 'RootRecord Solana Tools | Cheapest Token Creator on Solana',
    description:
      'Fast, cheap, on-chain SPL token creation that respects your SOL.',
    url: SITE_URL,
    siteName: 'RootRecord Solana Tools',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RootRecord Solana Tools',
    description:
      'Cheap, fast, no-BS Solana token creator. ~Half the cost of competitors.',
  },
};

export const viewport: Viewport = {
  themeColor: '#06090F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrument.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans min-h-screen flex flex-col antialiased">
        <SolanaProviders>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0A0F1A',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#E6EAF2',
              },
            }}
          />
        </SolanaProviders>
      </body>
    </html>
  );
}
