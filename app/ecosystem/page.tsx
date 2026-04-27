'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const WSOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const OTC_USD_PER_TOKEN = 0.00001;
const QUOTE_TTL_MS = 30_000;

type BotEvent = {
  id: number;
  created_at: string;
  bot_id: string;
  event_type: string;
  pool_id: string | null;
  mint: string | null;
  tx_signature: string | null;
  amount_token_raw: string | null;
  amount_quote_raw: string | null;
  quote_currency: string | null;
  usd_estimate: string | null;
  metadata: string | null;
};

type ReinvestRow = {
  id: number;
  created_at: string;
  source: string;
  amount_usd: string;
  status: string;
  metadata: string | null;
};

function defaultTokenMint(): string {
  return (
    process.env.NEXT_PUBLIC_ECOSYSTEM_TOKEN_MINT?.trim() ||
    '6KfGKe13ASrV5WHvChbapQXxxEFRNqwpwrdEVsX6RQMT'
  );
}

export default function EcosystemPage() {
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [eventsErr, setEventsErr] = useState<string | null>(null);
  const [reinvest, setReinvest] = useState<ReinvestRow[]>([]);
  const [tokenMint, setTokenMint] = useState(defaultTokenMint);
  const [tokenDecimals, setTokenDecimals] = useState(9);
  const [tokenAmount, setTokenAmount] = useState('1000');
  const [payWith, setPayWith] = useState<'SOL' | 'USDC'>('SOL');
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [usdcUsd, setUsdcUsd] = useState<number | null>(null);
  const [priceFetchedAt, setPriceFetchedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadFeeds = useCallback(async () => {
    try {
      const [eRes, rRes] = await Promise.all([
        fetch('/api/solana-site/ecosystem-bot-events?limit=100'),
        fetch('/api/solana-site/ecosystem-reinvest-pending?limit=40'),
      ]);
      const eJson = (await eRes.json()) as { ok?: boolean; events?: BotEvent[]; detail?: string };
      if (!eRes.ok || !eJson.ok) {
        setEventsErr(eJson.detail || 'Could not load bot events');
        setEvents([]);
      } else {
        setEventsErr(null);
        setEvents(eJson.events ?? []);
      }
      const rJson = (await rRes.json()) as { ok?: boolean; rows?: ReinvestRow[] };
      if (rRes.ok && rJson.ok) setReinvest(rJson.rows ?? []);
    } catch {
      setEventsErr('Network error loading feed');
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    try {
      const r = await fetch('/api/ecosystem/jup-prices');
      const j = (await r.json()) as {
        ok?: boolean;
        sol_usd?: number;
        usdc_usd?: number;
        detail?: string;
      };
      if (r.ok && j.ok && j.sol_usd) {
        setSolUsd(j.sol_usd);
        setUsdcUsd(j.usdc_usd ?? 1);
        setPriceFetchedAt(Date.now());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadFeeds();
    const t = setInterval(() => void loadFeeds(), 45_000);
    return () => clearInterval(t);
  }, [loadFeeds]);

  useEffect(() => {
    void refreshPrices();
    const t = setInterval(() => void refreshPrices(), 12_000);
    return () => clearInterval(t);
  }, [refreshPrices]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const quoteDeadline = priceFetchedAt != null ? priceFetchedAt + QUOTE_TTL_MS : null;
  const secondsLeft =
    quoteDeadline != null ? Math.max(0, Math.ceil((quoteDeadline - now) / 1000)) : null;
  const quoteStale = secondsLeft === 0;

  const otc = useMemo(() => {
    const n = parseFloat(tokenAmount.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0 || !solUsd) {
      return { usdTotal: null as number | null, sol: null as number | null, usdc: null as number | null };
    }
    const usdTotal = n * OTC_USD_PER_TOKEN;
    const sol = usdTotal / solUsd;
    const uusd = usdcUsd && usdcUsd > 0 ? usdcUsd : 1;
    const usdc = usdTotal / uusd;
    return { usdTotal, sol, usdc };
  }, [tokenAmount, solUsd, usdcUsd]);

  const jupiterUrl = useMemo(() => {
    const mint = tokenMint.trim();
    if (!mint) return '';
    const inputMint = payWith === 'SOL' ? WSOL : USDC;
    const params = new URLSearchParams({
      inputMint,
      outputMint: mint,
    });
    if (payWith === 'SOL' && otc.sol != null && otc.sol > 0) {
      const lamports = Math.max(1, Math.floor(otc.sol * 1e9));
      params.set('amount', String(lamports));
    }
    if (payWith === 'USDC' && otc.usdc != null && otc.usdc > 0) {
      const micro = Math.max(1, Math.floor(otc.usdc * 1e6));
      params.set('amount', String(micro));
    }
    return `https://jup.ag/swap?${params.toString()}`;
  }, [tokenMint, payWith, otc.sol, otc.usdc]);

  return (
    <div className="container py-14 md:py-20 max-w-4xl space-y-10">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Program (unlisted)
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">
          Liquidity &amp; ecosystem transparency
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          This page documents how RootRecord Solana tooling ties on-chain activity to deeper pool
          liquidity. It is not linked in the main navigation while we iterate.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stable reference &amp; pool depth</CardTitle>
          <CardDescription className="leading-relaxed">
            Automated mirror bots watch our Raydium CPMM pool and react to organic flow in small,
            time-bucketed clips so we do not move the market in a single print. Operator wallets use
            Jupiter for execution; caps on each leg keep sales proportional to pool inventory and to
            the size of third-party trades. Together with manual treasury policy, this is designed
            to recycle flow back into the pair over time instead of concentrating volatility in one
            block.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3 leading-relaxed">
          <p>
            <strong className="text-foreground">Creation &amp; management fees</strong> collected
            from token creation, metadata, liquidity, and bulk-send flows on{' '}
            <Link href="/" className="text-sol-green hover:underline">
              solana.rootrecord.info
            </Link>{' '}
            are retained in treasury wallets. A portion is earmarked for{' '}
            <strong className="text-foreground">Raydium CPMM add-liquidity</strong> when the
            cumulative USD value crosses thresholds (for example $20 tranches). Those adds are
            executed the same way you would from the Liquidity page: deposit TOKEN + quote side into
            the existing pool so total value locked grows with real usage.
          </p>
          <p>
            <strong className="text-foreground">Scraped mirror profits</strong> from the pool-mirror
            bots are treated the same way: they are not an exit to zero-sum drain — the default
            configuration caps each sell, throttles buy-backs when we already hold most of the
            supply, and can aggregate per-minute so Jupiter and RPC spend stay predictable.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">OTC reference — $0.00001 USD per token</CardTitle>
          <CardDescription>
            Indicative only. We show a live SOL / USDC USD mark from Jupiter&apos;s public price API,
            compute how much you would pay for a chosen token amount at{' '}
            <strong>${OTC_USD_PER_TOKEN.toFixed(5)}</strong> per token, then open Jupiter with those
            mints prefilled. You should{' '}
            <strong className="text-foreground">sign within {QUOTE_TTL_MS / 1000}s</strong> of a
            fresh quote or refresh prices before swapping.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="eco-mint">Token mint (output)</Label>
              <Input
                id="eco-mint"
                className="font-mono text-xs"
                value={tokenMint}
                onChange={(e) => setTokenMint(e.target.value.trim())}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eco-dec">Decimals (for raw amount in Jupiter link)</Label>
              <Input
                id="eco-dec"
                type="number"
                min={0}
                max={12}
                value={tokenDecimals}
                onChange={(e) => setTokenDecimals(parseInt(e.target.value, 10) || 9)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eco-amt">Token amount (human, whole or fractional)</Label>
            <Input
              id="eco-amt"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={payWith === 'SOL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPayWith('SOL')}
            >
              Pay with SOL
            </Button>
            <Button
              type="button"
              variant={payWith === 'USDC' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPayWith('USDC')}
            >
              Pay with USDC
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-ink-700/30 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Notional @ {OTC_USD_PER_TOKEN} USD / token</span>
              <span className="font-mono">
                {otc.usdTotal != null ? `≈ $${otc.usdTotal.toFixed(6)}` : '—'}
              </span>
            </div>
            {payWith === 'SOL' ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">≈ SOL @ {solUsd ? `$${solUsd.toFixed(4)}` : '…'}</span>
                <span className="font-mono">{otc.sol != null ? `${otc.sol.toFixed(8)} SOL` : '—'}</span>
              </div>
            ) : (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">≈ USDC</span>
                <span className="font-mono">{otc.usdc != null ? `${otc.usdc.toFixed(6)} USDC` : '—'}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 text-xs text-muted-foreground">
              <span>Quote window</span>
              <span>
                {secondsLeft != null
                  ? quoteStale
                    ? 'Expired — refresh'
                    : `${secondsLeft}s remaining`
                  : 'Loading prices…'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshPrices()}>
              Refresh prices
            </Button>
            <Button type="button" size="sm" asChild disabled={!jupiterUrl || quoteStale}>
              <a href={jupiterUrl || '#'} target="_blank" rel="noreferrer">
                Open Jupiter (prefilled)
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Jupiter routes across venues; slippage and final fill may differ from this reference.
            Always verify the preview in your wallet before signing.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reinvest queue (pending)</CardTitle>
          <CardDescription>
            Rows are created when automation or scripts POST to the Worker with a USD tranche (same
            auth as site logging). Operators complete add-liquidity manually or via treasury
            tooling, then mark rows done out of band.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reinvest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending rows.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {reinvest.map((r) => (
                    <tr key={r.id} className="border-t border-border/70">
                      <td className="px-3 py-2 text-muted-foreground text-xs">{r.created_at}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.source}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.amount_usd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bot telemetry (D1)</CardTitle>
          <CardDescription>
            Latest events ingested from mirror scripts into{' '}
            <code className="text-xs">ecosystem_bot_events</code>. Each row is append-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsErr ? (
            <p className="text-sm text-destructive">{eventsErr}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet (or Worker env not wired).</p>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Bot</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Tx</th>
                    <th className="px-3 py-2 font-medium">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-t border-border/70">
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {ev.created_at}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{ev.bot_id}</td>
                      <td className="px-3 py-2 font-mono text-xs">{ev.event_type}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {ev.tx_signature ? (
                          <a
                            href={`https://solscan.io/tx/${ev.tx_signature}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sol-green hover:underline"
                          >
                            {ev.tx_signature.slice(0, 10)}…
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] break-all">
                        {ev.metadata || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Configure <code className="text-[11px]">NEXT_PUBLIC_ECOSYSTEM_TOKEN_MINT</code> in Vercel to
        change the default mint on this OTC form.
      </p>
    </div>
  );
}
