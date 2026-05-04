import type { Metadata } from 'next';

import { WalletManagerClient } from './WalletManagerClient';

export const metadata: Metadata = {
  title: 'Wallet manager',
  description: 'Internal D1 wallet overview (authorized operator only).',
  robots: { index: false, follow: false },
};

export default function WalletManagerPage() {
  return <WalletManagerClient />;
}
