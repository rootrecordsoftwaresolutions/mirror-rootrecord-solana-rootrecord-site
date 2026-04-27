'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { VersionedTransaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

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

import {
  ECOSYSTEM_OTC_TOKEN_MINT,
  OTC_USD_PER_TOKEN,
  ecosystemOtcQuoteRetainPercentLabel,
  ecosystemOtcUsdcAutoLpEnabled,
  ecosystemOtcUsdcLpResumeLabel,
} from '@/lib/ecosystemOtcConstants';
import { getConnection } from '@/lib/solana';

const QUOTE_TTL_MS = 30_000;

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

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

function parseJsonRecord(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text) as unknown;
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const TELEMETRY_404_HELP =
  'No telemetry API (404). Deploy rootrecord-primary with the ecosystem routes and apply D1 migration 0011 so GET /api/solana-site/ecosystem-bot-events exists.';

export default function EcosystemPage() {
  const { publicKey, signTransaction } = useWallet();
  const [treasuryAddr, setTreasuryAddr] = useState<string | null>(null);
  const [buyerWallet, setBuyerWallet] = useState('');
  const [paymentSig, setPaymentSig] = useState('');
  const [fulfillLoading, setFulfillLoading] = useState(false);
  const [fulfillMsg, setFulfillMsg] = useState<string | null>(null);
  const [lastOutSig, setLastOutSig] = useState<string | null>(null);
  const [lastLiquidityTx, setLastLiquidityTx] = useState<string | null>(null);
  const [lastLiquidityErr, setLastLiquidityErr] = useState<string | null>(null);
  const [lastLiquidityNotice, setLastLiquidityNotice] = useState<string | null>(null);

  const [events, setEvents] = useState<BotEvent[]>([]);
  const [eventsErr, setEventsErr] = useState<string | null>(null);
  const [reinvest, setReinvest] = useState<ReinvestRow[]>([]);
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
      const eText = await eRes.text();
      const eParsed = parseJsonRecord(eText);
      const eJson = (eParsed ?? {}) as { ok?: boolean; events?: BotEvent[]; detail?: string; skipped?: boolean };
      if (eRes.ok && eJson.ok) {
        setEventsErr(null);
        setEvents(eJson.events ?? []);
      } else {
        const detailStr =
          typeof eJson.detail === 'string' ? eJson.detail.trim() : '';
        const bodySnippet = !eParsed && eText.trim() ? eText.trim().slice(0, 200) : '';
        let msg =
          detailStr ||
          bodySnippet ||
          `Could not load bot events (HTTP ${eRes.status}).`;
        if (eRes.status === 404 || /^not found$/i.test(msg.trim())) {
          msg = TELEMETRY_404_HELP;
        }
        setEventsErr(msg);
        setEvents([]);
      }

      const rText = await rRes.text();
      const rParsed = parseJsonRecord(rText);
      const rJson = (rParsed ?? {}) as { ok?: boolean; rows?: ReinvestRow[] };
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

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/ecosystem/otc-treasury');
        const j = (await r.json()) as { ok?: boolean; treasury?: string };
        if (j.ok && j.treasury) setTreasuryAddr(j.treasury);
        else setTreasuryAddr(null);
      } catch {
        setTreasuryAddr(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (publicKey) setBuyerWallet(publicKey.toBase58());
  }, [publicKey]);

  const quoteDeadline = priceFetchedAt != null ? priceFetchedAt + QUOTE_TTL_MS : null;
  const secondsLeft =
    quoteDeadline != null ? Math.max(0, Math.ceil((quoteDeadline - now) / 1000)) : null;
  const quoteStale = secondsLeft === 0;

  const otc = useMemo(() => {
    const parsed = parseFloat(tokenAmount.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0 || !solUsd) {
      return {
        tokensWhole: null as number | null,
        usdTotal: null as number | null,
        solIdeal: null as number | null,
        usdcIdeal: null as number | null,
        solLamports: null as number | null,
        usdcMicro: null as number | null,
      };
    }
    const tokensWhole = Math.max(1, Math.ceil(parsed));
    const usdTotal = tokensWhole * OTC_USD_PER_TOKEN;
    const solIdeal = usdTotal / solUsd;
    const uusd = usdcUsd && usdcUsd > 0 ? usdcUsd : 1;
    const usdcIdeal = usdTotal / uusd;
    const solLamports = Math.max(1, Math.ceil(solIdeal * 1e9));
    const usdcMicro = Math.max(1, Math.ceil(usdcIdeal * 1e6));
    return { tokensWhole, usdTotal, solIdeal, usdcIdeal, solLamports, usdcMicro };
  }, [tokenAmount, solUsd, usdcUsd]);

  const claimTokens = useCallback(async () => {
    setFulfillMsg(null);
    setLastOutSig(null);
    setLastLiquidityTx(null);
    setLastLiquidityErr(null);
    setLastLiquidityNotice(null);
    if (otc.tokensWhole == null || quoteStale || priceFetchedAt == null) {
      setFulfillMsg('Refresh prices and stay within the quote window.');
      return;
    }
    const pw = paymentSig.trim();
    const buyer = buyerWallet.trim();
    if (!buyer || !pw) {
      setFulfillMsg('Enter buyer wallet and payment transaction signature.');
      return;
    }
    const body = {
      buyer_wallet: buyer,
      pay_with: payWith,
      tokens_whole: otc.tokensWhole,
      quoted_at_ms: priceFetchedAt,
      payment_tx_signature: pw,
    };
    setFulfillLoading(true);
    try {
      let r = await fetch('/api/ecosystem/fulfill-otc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      type FulfillJson = {
        ok?: boolean;
        detail?: string;
        signature?: string;
        code?: string;
        unsigned_tx_b64?: string;
        liquidity_tx?: string | null;
        liquidity_error?: string | null;
        liquidity_notice?: string | null;
      };
      let j = (await r.json()) as FulfillJson;

      if (r.status === 428 && j.code === 'needs_ata') {
        if (!signTransaction || !j.unsigned_tx_b64) {
          setFulfillMsg(
            j.detail ||
              'Connect a wallet that can sign transactions so you can pay the token account rent.',
          );
          return;
        }
        const vtx = VersionedTransaction.deserialize(base64ToUint8Array(j.unsigned_tx_b64));
        const signed = await signTransaction(vtx);
        const conn = getConnection();
        const latest = await conn.getLatestBlockhash('confirmed');
        const ataSig = await conn.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        });
        await conn.confirmTransaction(
          { signature: ataSig, ...latest },
          'confirmed',
        );
        r = await fetch('/api/ecosystem/fulfill-otc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        j = (await r.json()) as FulfillJson;
      }

      if (!r.ok || !j.ok) {
        setFulfillMsg(j.detail || `Request failed (${r.status})`);
        return;
      }
      setLastOutSig(j.signature ?? null);
      setLastLiquidityTx(j.liquidity_tx ?? null);
      setLastLiquidityErr(j.liquidity_error ?? null);
      setLastLiquidityNotice(j.liquidity_notice ?? null);
      setFulfillMsg(null);
      setPaymentSig('');
    } catch {
      setFulfillMsg('Network error');
    } finally {
      setFulfillLoading(false);
    }
  }, [otc.tokensWhole, payWith, paymentSig, buyerWallet, priceFetchedAt, quoteStale, signTransaction]);

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
          <CardTitle className="text-lg">OTC — $0.00001 USD per token (treasury)</CardTitle>
          <CardDescription>
            Live SOL / USDC marks from Jupiter&apos;s public price API. Fractional token counts round{' '}
            <strong className="text-foreground">up</strong> to the next whole token; SOL and USDC
            deposit amounts round <strong className="text-foreground">up</strong> to the next whole
            lamport or micro-USDC. Send that amount <strong className="text-foreground">from the
            same wallet that will receive tokens</strong> (fee payer must match), then paste the
            payment signature. If you do not already have an ATA for this mint, your wallet signs a
            one-time create (you pay rent). The server then transfers tokens from the treasury and,
            when <code className="text-[11px]">ECOSYSTEM_OTC_CPMM_POOL_ID</code> is set, deposits the
            SOL or USDC quote into that Raydium CPMM pool minus a{' '}
            <strong className="text-foreground">{ecosystemOtcQuoteRetainPercentLabel()}</strong>{' '}
            treasury reserve (default 1%;{' '}
            <code className="text-[11px]">ECOSYSTEM_OTC_QUOTE_RETAIN_BPS</code> or{' '}
            <code className="text-[11px]">NEXT_PUBLIC_ECOSYSTEM_OTC_QUOTE_RETAIN_BPS</code>)
            for transfer fees and later LP adds, with paired project token (no RootRecord add-liquidity
            fee on that step). <strong className="text-foreground">USDC</strong>{' '}
            OTC payments through <strong className="text-foreground">{ecosystemOtcUsdcLpResumeLabel()}</strong>{' '}
            stay in treasury for the initial USDC pair seed (auto-deposit resumes after that window
            unless configured otherwise). Claim while the quote window is green.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Deposit address (treasury)</Label>
            {treasuryAddr ? (
              <div className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs break-all text-muted-foreground">
                {treasuryAddr}{' '}
                <a
                  href={`https://solscan.io/account/${treasuryAddr}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sol-green hover:underline"
                >
                  Solscan
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Treasury not configured (set <code className="text-[11px]">ECOSYSTEM_OTC_TREASURY_PRIVATE_KEY</code>{' '}
                on the server).
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Token mint (output)</Label>
            <div className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs break-all text-muted-foreground">
              {ECOSYSTEM_OTC_TOKEN_MINT}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eco-amt">Token amount (fractions round up to whole tokens)</Label>
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
          {payWith === 'USDC' && !ecosystemOtcUsdcAutoLpEnabled() ? (
            <p className="text-sm text-muted-foreground leading-relaxed rounded-md border border-border bg-ink-700/20 px-3 py-2">
              USDC pool-side deposits are paused until the USDC CPMM LP exists. Until{' '}
              <strong className="text-foreground">{ecosystemOtcUsdcLpResumeLabel()}</strong>, your
              USDC payment is held for the initial seed; token delivery still runs as usual.
            </p>
          ) : null}
          <div className="rounded-lg border border-border bg-ink-700/30 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Tokens (rounded up)</span>
              <span className="font-mono">{otc.tokensWhole != null ? String(otc.tokensWhole) : '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Notional @ {OTC_USD_PER_TOKEN} USD / token</span>
              <span className="font-mono">
                {otc.usdTotal != null ? `≈ $${otc.usdTotal.toFixed(6)}` : '—'}
              </span>
            </div>
            {payWith === 'SOL' ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">SOL to send (rounded up)</span>
                <span className="font-mono">
                  {otc.solLamports != null
                    ? `${(otc.solLamports / 1e9).toFixed(9)} SOL`
                    : '—'}
                </span>
              </div>
            ) : (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">USDC to send (rounded up)</span>
                <span className="font-mono">
                  {otc.usdcMicro != null
                    ? `${(otc.usdcMicro / 1e6).toFixed(6)} USDC`
                    : '—'}
                </span>
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
          <div className="grid gap-2">
            <Label htmlFor="eco-buyer">Buyer wallet (receives tokens; must be payment fee payer)</Label>
            <Input
              id="eco-buyer"
              className="font-mono text-xs"
              value={buyerWallet}
              onChange={(e) => setBuyerWallet(e.target.value.trim())}
              placeholder="Connect wallet or paste address"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eco-pay-sig">Payment transaction signature</Label>
            <Input
              id="eco-pay-sig"
              className="font-mono text-xs"
              value={paymentSig}
              onChange={(e) => setPaymentSig(e.target.value.trim())}
              placeholder="After you send SOL or USDC to the treasury…"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshPrices()}>
              Refresh prices
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                fulfillLoading ||
                !treasuryAddr ||
                quoteStale ||
                otc.tokensWhole == null ||
                priceFetchedAt == null
              }
              onClick={() => void claimTokens()}
            >
              {fulfillLoading ? 'Sending tokens…' : 'Claim tokens (server transfer)'}
            </Button>
          </div>
          {fulfillMsg ? (
            <p className="text-sm text-destructive">{fulfillMsg}</p>
          ) : null}
          {lastOutSig ? (
            <p className="text-sm text-muted-foreground">
              Token transfer:{' '}
              <a
                href={`https://solscan.io/tx/${lastOutSig}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-sol-green hover:underline"
              >
                {lastOutSig.slice(0, 16)}…
              </a>
            </p>
          ) : null}
          {lastLiquidityTx ? (
            <p className="text-sm text-muted-foreground">
              Pool deposit:{' '}
              <a
                href={`https://solscan.io/tx/${lastLiquidityTx}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-sol-green hover:underline"
              >
                {lastLiquidityTx.slice(0, 16)}…
              </a>
            </p>
          ) : null}
          {lastLiquidityErr ? (
            <p className="text-sm text-amber-600/90">Liquidity step: {lastLiquidityErr}</p>
          ) : null}
          {lastLiquidityNotice ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{lastLiquidityNotice}</p>
          ) : null}
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
    </div>
  );
}
