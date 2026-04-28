import type { Metadata } from 'next';
import { ReferralsClient } from './ReferralsClient';

export const metadata: Metadata = {
  title: 'Referrals',
  description:
    'Share RootRecord with ?ref=your wallet. A percentage of each referred platform fee goes to the referrer in the same transaction. Treasury OTC checkouts are excluded.',
};

export default function ReferralsPage() {
  return <ReferralsClient />;
}
