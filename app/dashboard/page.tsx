import type { Metadata } from 'next';

import { pageSeo, SEO_KEYWORDS } from '@/lib/seo';

export const metadata: Metadata = pageSeo({
  path: '/dashboard',
  title: 'Dashboard',
  description: 'RootRecord Solana Tools — dashboard.',
  keywords: [...SEO_KEYWORDS.core],
});

export default function DashboardPage() {
  return (
    <div className="container py-14 md:py-20 min-h-[60vh]">
      <h1 className="sr-only">Dashboard</h1>
    </div>
  );
}
