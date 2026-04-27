'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from '@/lib/utils';
import { WalletMultiButton } from '@/components/wallet/WalletButton';
import { ReferralPill } from '@/components/ReferralPill';

const NAV = [
  { href: '/create', label: 'Create Token' },
  { href: '/liquidity', label: 'Liquidity' },
  { href: '/tools', label: 'Tools' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/token-stats', label: 'Token Stats' },
  { href: '/bulk', label: 'Bulk SOL' },
  { href: '/my-actions', label: 'My Actions' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

export function Header() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const nav = NAV.filter((n) => n.href !== '/my-actions' || connected);
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
          {nav.map((n) => {
            const active =
              pathname === n.href ||
              (n.href === '/token-stats' && pathname.startsWith('/ref/'));
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
