import type { Metadata } from 'next';
import { ReferralsClient } from './ReferralsClient';

export const metadata: Metadata = {
  title: 'Referrals',
  description:
    'Share RootRecord Solana Tools with ?ref=your wallet. Fee transactions can include an on-chain memo for attribution; payout policy is announced separately.',
};

export default function ReferralsPage() {
  return <ReferralsClient />;
}
