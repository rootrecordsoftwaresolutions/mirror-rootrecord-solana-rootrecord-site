import type { Metadata } from 'next';

import { WalletGeneratorClient } from './WalletGeneratorClient';
import { getPublicSiteOrigin } from '@/lib/siteOrigin';

export async function generateMetadata(): Promise<Metadata> {
  const origin = getPublicSiteOrigin();
  const canonical = `${origin.replace(/\/$/, '')}/wallet-generator`;
  return {
    title: 'Wallet Generator',
    description:
      'Print a tent-fold Solana paper wallet: public address on one face, branding on the other, private key on a middle band you tuck inside before folding.',
    alternates: { canonical },
    openGraph: {
      title: 'Wallet Generator · RootRecord Solana Tools',
      url: canonical,
      description:
        'Print a tent-fold Solana paper wallet with public and private QR codes.',
    },
  };
}

export default function WalletGeneratorPage() {
  return <WalletGeneratorClient />;
}
