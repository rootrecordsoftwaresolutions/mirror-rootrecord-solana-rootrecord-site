'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WalletMultiButton } from '@/components/wallet/WalletButton';
import { ReferralPill } from '@/components/ReferralPill';

const NAV = [
  { href: '/create', label: 'Create Token' },
  { href: '/launch', label: 'Launch pool' },
  { href: '/tools', label: 'Tools' },
  { href: '/bulk', label: 'Bulk SOL' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-40 border-b border-border bg-ink-900/70 backdrop-blur-md"
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          data-testid="brand-link"
          className="flex items-baseline gap-2 group"
        >
          <span className="text-lg font-semibold tracking-tight">
            Root<span className="text-sol-green">Record</span>
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            / Solana Tools
          </span>
        </Link>

        <nav
          data-testid="primary-nav"
          className="hidden md:flex items-center gap-7 text-sm"
        >
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                data-testid={`nav-${n.label.toLowerCase().replace(' ', '-')}`}
                className={cn(
                  'transition-colors hover:text-foreground',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ReferralPill />
          <div data-testid="wallet-button-wrap" className="rr-wallet-btn">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </header>
  );
}
