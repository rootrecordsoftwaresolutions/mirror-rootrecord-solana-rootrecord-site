import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Liquidity & ecosystem program | RootRecord Solana',
  description:
    'How RootRecord uses tooling fees and automated pool mirroring to deepen liquidity and keep OTC reference pricing transparent.',
  robots: { index: false, follow: false },
};

export default function EcosystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
