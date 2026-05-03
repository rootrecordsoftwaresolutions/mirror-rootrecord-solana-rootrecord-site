'use client';

import type { ReactNode } from 'react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  FileText,
  Globe2,
  PlayCircle,
  Receipt,
  Scroll,
  Share2,
  Sparkles,
  Timer,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToolDialog, type ToolKind } from '@/components/tools/ToolDialog';
import { TOOL_CATALOG, type ToolCatalogEntry } from '@/lib/toolsCatalog';
import { cn } from '@/lib/utils';

const SIDEBAR_NAV: { id: string; label: string }[] = [
  { id: 'dashboard-overview', label: 'Overview' },
  { id: 'dashboard-launch', label: 'Launch' },
  { id: 'dashboard-token-manage', label: 'Token manage' },
  { id: 'dashboard-liquidity', label: 'Liquidity' },
  { id: 'dashboard-distribute', label: 'Distribute' },
  { id: 'dashboard-discover', label: 'Discover' },
  { id: 'dashboard-program', label: 'Program & docs' },
  { id: 'dashboard-account', label: 'Account' },
];

type LinkCard = {
  type: 'link';
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: 'green' | 'purple';
  badge?: string;
};

type ToolCard = {
  type: 'tool';
  kind: ToolKind;
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: 'green' | 'purple';
  t2022?: boolean;
};

type HubCard = LinkCard | ToolCard;

function catalogToToolCards(entries: ToolCatalogEntry[]): HubCard[] {
  return entries.map((t) => {
    if ('href' in t) {
      const link: LinkCard = {
        type: 'link',
        href: t.href,
        title: t.title,
        desc: t.desc,
        icon: t.icon,
        tone: t.tone,
      };
      if (t.t2022) link.badge = 'Token-2022';
      return link;
    }
    const tool: ToolCard = {
      type: 'tool',
      kind: t.kind,
      title: t.title,
      desc: t.desc,
      icon: t.icon,
      tone: t.tone,
    };
    if (t.t2022) tool.t2022 = true;
    return tool;
  });
}

const LAUNCH_CARDS: LinkCard[] = [
  {
    type: 'link',
    href: '/create',
    title: 'Create token',
    desc: 'Fresh SPL or Token-2022 mint, ATA, supply to your wallet, and Metaplex metadata pinned to IPFS — in one signed flow.',
    icon: Sparkles,
    tone: 'green',
  },
];

const DISTRIBUTE_CARDS: LinkCard[] = [
  {
    type: 'link',
    href: '/wallet-generator',
    title: 'Paper wallet',
    desc: 'Generate a keypair in-browser and print a tent-fold sheet with QR codes and base58 backup.',
    icon: Scroll,
    tone: 'purple',
  },
];

const DISCOVER_CARDS: LinkCard[] = [
  {
    type: 'link',
    href: '/recent-tokens',
    title: 'New tokens',
    desc: 'Recently launched mints surfaced from this site — quick links to explorers and stats.',
    icon: Globe2,
    tone: 'green',
  },
  {
    type: 'link',
    href: '/token-stats',
    title: 'Token stats',
    desc: 'Supply, holders snapshot, recent transactions, and a Jupiter price hint for any mint you paste.',
    icon: BarChart3,
    tone: 'purple',
  },
  {
    type: 'link',
    href: '/ecosystem',
    title: 'Purpose',
    desc: 'Treasury transfer tool, program context, and how fees route into liquidity.',
    icon: BookOpen,
    tone: 'green',
  },
  {
    type: 'link',
    href: '/tokenomics',
    title: 'Tokenomics',
    desc: 'Pools, treasury reference pricing, and how to read multi-pool markets — descriptive docs.',
    icon: FileText,
    tone: 'purple',
  },
];

const PROGRAM_CARDS: LinkCard[] = [
  {
    type: 'link',
    href: '/contracts',
    title: 'Contracts hub',
    desc: 'Roadmap for native vesting, locks, and deal structure — what is live vs in development.',
    icon: Wallet,
    tone: 'green',
  },
  {
    type: 'link',
    href: '/contracts/vesting',
    title: 'Vesting roadmap',
    desc: 'Linear vesting and schedules — follow progress as on-chain programs ship.',
    icon: Timer,
    tone: 'purple',
  },
  {
    type: 'link',
    href: '/referrals',
    title: 'Referrals',
    desc: 'Share referral links so a slice of certain platform fees can route to your wallet.',
    icon: Share2,
    tone: 'green',
  },
  {
    type: 'link',
    href: '/pricing',
    title: 'Pricing',
    desc: 'Flat SOL per action — create, tools, liquidity, bulk sends — with competitor context.',
    icon: Receipt,
    tone: 'purple',
  },
  {
    type: 'link',
    href: '/docs',
    title: 'Docs',
    desc: 'Technical notes, env setup, and how flows map to on-chain programs.',
    icon: BookOpen,
    tone: 'green',
  },
  {
    type: 'link',
    href: '/start',
    title: 'Start here',
    desc: 'Install a wallet, connect, understand fees, and verify transactions on an explorer.',
    icon: PlayCircle,
    tone: 'purple',
  },
];

function HubCardView({
  card,
  onOpenTool,
}: {
  card: HubCard;
  onOpenTool: (k: ToolKind) => void;
}) {
  const isLink = card.type === 'link';
  const tone = card.tone;
  const Icon = card.icon;

  const inner = (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {card.type === 'tool' && card.t2022 && (
              <span className="text-[10px] uppercase tracking-[0.14em] rounded-full px-2 py-0.5 border border-sol-purple/40 bg-sol-purple/10 text-sol-purple">
                Token-2022
              </span>
            )}
            {card.type === 'link' && card.badge && (
              <span className="text-[10px] uppercase tracking-[0.14em] rounded-full px-2 py-0.5 border border-sol-green/40 bg-sol-green/10 text-sol-green">
                {card.badge}
              </span>
            )}
          </div>
          <Icon
            className={cn(
              'h-5 w-5 shrink-0 transition-colors',
              tone === 'green'
                ? 'text-muted-foreground group-hover:text-sol-green'
                : 'text-muted-foreground group-hover:text-sol-purple',
            )}
          />
        </div>
        <CardTitle className="mt-3 text-base leading-snug">{card.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm leading-relaxed line-clamp-4">
          {card.desc}
        </CardDescription>
        <div className="mt-4">
          {isLink ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-sol-green">
              Open <ArrowRight className="h-4 w-4" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-sol-green">
              Open tool <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </CardContent>
    </>
  );

  const shell = cn(
    'group h-full border-border/80 bg-card/40 transition-all hover:-translate-y-0.5 hover:border-sol-green/35 hover:shadow-[0_0_32px_-14px_rgba(20,241,149,0.22)]',
    isLink ? 'cursor-pointer' : 'cursor-pointer',
  );

  if (isLink) {
    return (
      <Link
        href={card.href}
        className="block rounded-xl text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Card className={shell}>{inner}</Card>
      </Link>
    );
  }

  return (
    <Card className={shell} onClick={() => onOpenTool(card.kind)}>
      {inner}
    </Card>
  );
}

function Section({
  id,
  kicker,
  title,
  subtitle,
  children,
}: {
  id: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 pt-4 first:pt-0">
      <div className="mb-6">
        {kicker ? (
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{kicker}</div>
        ) : null}
        <h2 className="font-display text-2xl md:text-3xl tracking-tight text-foreground">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground leading-relaxed">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className={cn(
        'rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors',
        'hover:bg-white/5 hover:text-foreground',
      )}
    >
      {label}
    </a>
  );
}

function DashboardHubInner() {
  const params = useSearchParams();
  const { connected } = useWallet();
  const [active, setActive] = useState<ToolKind | null>(null);
  const [initialMint, setInitialMint] = useState<string | undefined>();

  const tokenManageCards = useMemo(
    () => catalogToToolCards(TOOL_CATALOG.filter((e): e is ToolCatalogEntry & { kind: ToolKind } => 'kind' in e)),
    [],
  );
  const liquidityCards = useMemo(
    () => catalogToToolCards(TOOL_CATALOG.filter((e) => 'href' in e && e.href === '/liquidity')),
    [],
  );
  const bulkCards = useMemo(
    () => catalogToToolCards(TOOL_CATALOG.filter((e) => 'href' in e && e.href === '/bulk')),
    [],
  );

  const actionParam = params.get('action');
  const mintParam = params.get('mint')?.trim() || '';

  useEffect(() => {
    if (actionParam === 'mint') {
      setActive('mint-more');
      setInitialMint(mintParam || undefined);
    } else if (actionParam === 'burn') {
      setActive('burn-tokens');
      setInitialMint(mintParam || undefined);
    }
  }, [actionParam, mintParam]);

  const accountCards: LinkCard[] = useMemo(
    () => [
      {
        type: 'link',
        href: '/account',
        title: 'Account',
        desc: 'Sign in with RootRecord portal to see custodial balances and Solana Tools history where enabled.',
        icon: User,
        tone: 'green',
      },
      {
        type: 'link',
        href: '/my-actions',
        title: 'My actions',
        desc: connected
          ? 'Log of actions you ran while connected on this device (local history).'
          : 'Connect a wallet to append on-chain actions to your local history.',
        icon: Activity,
        tone: 'purple',
      },
    ],
    [connected],
  );

  return (
    <div className="flex w-full min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Mobile / tablet: horizontal section jump */}
      <nav
        className="flex gap-1 overflow-x-auto border-b border-border bg-ink-950/90 px-3 py-2 lg:hidden"
        aria-label="Dashboard sections"
      >
        {SIDEBAR_NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="shrink-0 rounded-full border border-border/80 bg-ink-900/80 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-sol-green/40 hover:text-foreground"
          >
            {n.label}
          </a>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <aside
        className="hidden w-60 shrink-0 flex-col border-b border-border bg-ink-950/95 lg:flex lg:border-b-0 lg:border-r"
        aria-label="Dashboard navigation"
      >
        <div className="border-b border-border/80 px-4 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            Root<span className="text-sol-green">Record</span>
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Solana Tools · Dashboard</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {SIDEBAR_NAV.map((n) => (
            <SidebarLink key={n.id} href={`#${n.id}`} label={n.label} />
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 bg-gradient-to-b from-background to-ink-950/40">
        <div className="border-b border-border bg-ink-950/80 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Verify you are on{' '}
          <span className="font-mono text-sol-green">solana.rootrecord.info</span>
          {' — '}bookmark the official site. Phishing sites may mimic this layout.
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-12">
          <section id="dashboard-overview" className="scroll-mt-28">
            <Badge className="mb-4 border-sol-green/30 bg-sol-green/10 text-sol-green">
              Solana mainnet
            </Badge>
            <h1 className="font-display text-4xl tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Every tool in{' '}
              <em className="text-sol-green not-italic font-display italic">one workspace</em>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground leading-relaxed md:text-lg">
              Launch, manage authorities and metadata, move liquidity, batch pays, and read the program
              — organized like a product hub. Same on-chain flows as the rest of the site; this page is
              a map, not a replacement for signing in your wallet.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <span className="rounded-full border border-sol-green/50 bg-sol-green/15 px-4 py-1.5 text-sm font-medium text-sol-green">
                Solana
              </span>
              {['BSC', 'Base', 'Ethereum', 'More'].map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border/80 bg-ink-900/60 px-4 py-1.5 text-sm text-muted-foreground"
                  title="Not available on this deployment"
                >
                  {c}
                </span>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="group">
                <Link href="/create">
                  Create token
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tools">Classic Tools page</Link>
              </Button>
            </div>
          </section>

          <div className="mt-16 space-y-20">
            <Section
              id="dashboard-launch"
              kicker="Launch"
              title="Create &amp; issue"
              subtitle="Start a new mint with metadata — the same flow as /create."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {LAUNCH_CARDS.map((c) => (
                  <HubCardView key={c.href} card={c} onOpenTool={setActive} />
                ))}
              </div>
            </Section>

            <Section
              id="dashboard-token-manage"
              kicker="Token manage"
              title="Operate your mint"
              subtitle="Authorities, supply, metadata, Token-2022 fees, and holder freeze tools — dialogs match /tools."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tokenManageCards.map((c) => (
                  <HubCardView
                    key={c.type === 'tool' ? c.kind : c.href}
                    card={c}
                    onOpenTool={setActive}
                  />
                ))}
              </div>
            </Section>

            <Section
              id="dashboard-liquidity"
              kicker="Liquidity"
              title="Pools &amp; Raydium CPMM"
              subtitle="Create or add to pools — same experience as /liquidity."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {liquidityCards.map((c) => (
                  <HubCardView
                    key={c.type === 'tool' ? c.kind : c.href}
                    card={c}
                    onOpenTool={setActive}
                  />
                ))}
              </div>
            </Section>

            <Section
              id="dashboard-distribute"
              kicker="Distribute"
              title="Pays &amp; cold storage"
              subtitle="Batch transfers and printable wallets."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {bulkCards.map((c) => (
                  <HubCardView
                    key={c.type === 'tool' ? c.kind : c.href}
                    card={c}
                    onOpenTool={setActive}
                  />
                ))}
                {DISTRIBUTE_CARDS.map((c) => (
                  <HubCardView key={c.href} card={c} onOpenTool={setActive} />
                ))}
              </div>
            </Section>

            <Section
              id="dashboard-discover"
              kicker="Discover"
              title="Markets &amp; program context"
              subtitle="Explore mints, stats, and how the treasury program fits together."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {DISCOVER_CARDS.map((c) => (
                  <HubCardView key={c.href} card={c} onOpenTool={setActive} />
                ))}
              </div>
            </Section>

            <Section
              id="dashboard-program"
              kicker="Program &amp; docs"
              title="Contracts, fees, and learning"
              subtitle="Roadmap surfaces, referral economics, pricing transparency, and onboarding."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {PROGRAM_CARDS.map((c) => (
                  <HubCardView key={c.href} card={c} onOpenTool={setActive} />
                ))}
              </div>
            </Section>

            <Section
              id="dashboard-account"
              kicker="Account"
              title="You on RootRecord"
              subtitle="Portal sign-in and a local log of wallet actions from this browser."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {accountCards.map((c) => (
                  <HubCardView key={c.href} card={c} onOpenTool={setActive} />
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>

      <ToolDialog kind={active} initialMint={initialMint} onClose={() => setActive(null)} />
    </div>
  );
}

export function DashboardHub() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] border-t border-border bg-background px-4 py-16 text-center text-sm text-muted-foreground" />}>
      <DashboardHubInner />
    </Suspense>
  );
}
