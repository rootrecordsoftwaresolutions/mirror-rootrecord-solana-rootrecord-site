import type { Metadata } from 'next';

import { ECOSYSTEM_LISTING_NAME, ECOSYSTEM_LISTING_SYMBOL } from '@/lib/ecosystemOtcConstants';

export const metadata: Metadata = {
  title: `Purpose — ${ECOSYSTEM_LISTING_SYMBOL} (${ECOSYSTEM_LISTING_NAME}) | RootRecord Solana`,
  description: `${ECOSYSTEM_LISTING_NAME} (${ECOSYSTEM_LISTING_SYMBOL}): fee and treasury mechanics, Solana pool context, and the live Treasury Transfer Tool in one page.`,
  robots: { index: true, follow: true },
};

export default function EcosystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
