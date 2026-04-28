import type { Metadata } from 'next';

import { WalletGeneratorClient } from './WalletGeneratorClient';
import { getPublicSiteOrigin } from '@/lib/siteOrigin';

export async function generateMetadata(): Promise<Metadata> {
  const origin = getPublicSiteOrigin();
  const canonical = `${origin.replace(/\/$/, '')}/wallet-generator`;
  return {
    title: 'Wallet Generator',
    description:
      'Create four Solana paper wallets in your browser. Printable sheet with public and private QR codes and base58 keys.',
    alternates: { canonical },
    openGraph: {
      title: 'Wallet Generator · RootRecord Solana Tools',
      url: canonical,
      description:
        'Print Solana paper wallets with QR codes for your address and private key.',
    },
  };
}

export default function WalletGeneratorPage() {
  return <WalletGeneratorClient />;
}
