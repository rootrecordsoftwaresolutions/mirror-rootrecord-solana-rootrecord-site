import type { Metadata } from 'next';

import { WalletGeneratorClient } from './WalletGeneratorClient';
import { pageSeo, SEO_KEYWORDS } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageSeo({
    path: '/wallet-generator',
    title: 'Solana paper wallet generator',
    description:
      'Generate a Solana keypair in your browser and print a tent-fold paper wallet: public address QR, private key QR (concealed fold), and RootRecord branding. Ink-friendly light layout for PDF or printer.',
    keywords: [
      ...SEO_KEYWORDS.core,
      'cold storage',
      'print wallet',
      'QR private key',
      'offline wallet',
    ],
  });
}

export default function WalletGeneratorPage() {
  return <WalletGeneratorClient />;
}
