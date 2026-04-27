import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Purpose — ROOTR interactive whitepaper | RootRecord Solana',
  description:
    'ROOTR token purpose, fee and treasury mechanics, Solana pool context, and live treasury OTC checkout in one page.',
  robots: { index: true, follow: true },
};

export default function EcosystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
