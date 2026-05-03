import type { Metadata } from 'next';

import { DashboardHub } from '@/components/dashboard/DashboardHub';
import { pageSeo, SEO_KEYWORDS } from '@/lib/seo';

export const metadata: Metadata = pageSeo({
  path: '/dashboard',
  title: 'Dashboard',
  description:
    'Single-page hub for RootRecord Solana Tools: create tokens, manage mints and metadata, Raydium liquidity, bulk sends, wallet generator, token stats, ecosystem, pricing, and docs — same flows as the rest of the site.',
  keywords: [
    ...SEO_KEYWORDS.core,
    'Solana dashboard',
    'token tools hub',
    'SPL token management',
    'Raydium liquidity tools',
  ],
});

export default function DashboardPage() {
  return <DashboardHub />;
}
