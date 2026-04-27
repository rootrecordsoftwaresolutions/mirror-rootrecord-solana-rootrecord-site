'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { ExternalLink, Rocket, Info } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WalletMultiButton } from '@/components/wallet/WalletButton';

import {
  createCpmmPoolWithQuote,
  explorerUrl,
  type LaunchQuoteKind,
} from '@/lib/raydiumCpmmLaunch';
import { getStoredReferrer } from '@/lib/referral';
import {
  isFeeWalletConfigured,
  LAUNCH_FEE_SOL,
  RAYDIUM_MAINNET_CPMM_POOL_CREATE_FEE_SOL,
  SOLANA_NETWORK,
} from '@/lib/solana';

function LaunchPageInner() {
  const params = useSearchParams();
  const wallet = useWallet();
  const [mint, setMint] = useState('');
  const [tokenAmt, setTokenAmt] = useState('');
  const [quoteKind, setQuoteKind] = useState<LaunchQuoteKind>('wsol');
  const [quoteCustomMint, setQuoteCustomMint] = useState('');
  const [quoteAmt, setQuoteAmt] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastPool, setLastPool] = useState<string | null>(null);
  const [lastPoolTx, setLastPoolTx] = useState<string | null>(null);
  const [lastFeeTx, setLastFeeTx] = useState<string | null>(null);

  useEffect(() => {
    const m = params.get('mint')?.trim();
    if (m) setMint((prev) => (prev.trim() ? prev : m));
  }, [params]);

  const feeReady = isFeeWalletConfigured();
  const showFeeWarning = LAUNCH_FEE_SOL > 0 && !feeReady;

  const quoteLabel = useMemo(() => {
    if (quoteKind === 'wsol') return 'SOL paired into the pool';
    if (quoteKind === 'usdc') return 'USDC paired into the pool';
    return 'Quote token amount (human units, mint decimals)';
  }, [quoteKind]);

  const quotePlaceholder = useMemo(() => {
    if (quoteKind === 'wsol') return 'e.g. 0.5';
    if (quoteKind === 'usdc') return 'e.g. 100';
    return 'e.g. 250';
  }, [quoteKind]);

  const onLaunch = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!mint.trim()) {
      toast.error('Enter your token mint address');
      return;
    }
    if (!tokenAmt.trim() || !quoteAmt.trim()) {
      toast.error('Enter both starting amounts');
      return;
    }
    if (quoteKind === 'custom' && !quoteCustomMint.trim()) {
      toast.error('Enter the quote token mint');
      return;
    }

    setBusy(true);
    setLastPool(null);
    setLastPoolTx(null);
    setLastFeeTx(null);
    try {
      const { feeTxId, poolTxId, poolId } = await createCpmmPoolWithQuote(wallet, {
        baseMint: mint.trim(),
        tokenAmount: tokenAmt.trim(),
        quoteKind,
        quoteMint: quoteKind === 'custom' ? quoteCustomMint.trim() : undefined,
        quoteAmount: quoteAmt.trim(),
        referrer: getStoredReferrer(),
      });
      if (feeTxId) setLastFeeTx(feeTxId);
      setLastPoolTx(poolTxId);
      setLastPool(poolId);
      toast.success('Pool created — your pair is live on Raydium CPMM');
    } catch (e) {
      toast.error('Launch failed', {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const isDevnet = SOLANA_NETWORK === 'devnet';
  /** Raydium pool-creation fixed cost + optional RootRecord launcher fee (mainnet, SOL). */
  const mainnetSetupFixedSol =
    RAYDIUM_MAINNET_CPMM_POOL_CREATE_FEE_SOL + LAUNCH_FEE_SOL;

  return (
    <div className="container py-14 md:py-20 max-w-2xl">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
        Launch
      </div>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight">
        Pool & <em className="italic text-sol-green">liquidity</em> in one step
      </h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        Creates a{' '}
        <strong className="text-foreground">Raydium CPMM</strong> pool for your mint against
        SOL, USDC, or another SPL / Token-2022 asset, with the initial deposit. When a
        RootRecord fee applies, you sign that transaction first, then sign the Raydium pool
        transaction.
      </p>

      {!isDevnet && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed rounded-lg border border-border bg-ink-700/25 px-4 py-3">
          <strong className="text-foreground">Mainnet:</strong> Total setup is about{' '}
          <strong className="text-foreground">
            {mainnetSetupFixedSol.toFixed(2)} SOL
          </strong>{' '}
          plus the liquidity you deposit (same as Raydium). Small Solana network fees apply.
        </p>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-ink-700/30 p-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-sol-purple" />
        <div className="space-y-2">
          <p>
            You must already hold both sides in your wallet (ATAs). For SOL, you can use
            your native balance; small Solana network fees apply on each signed transaction.
          </p>
          <p>
            This flow is for{' '}
            <strong className="text-foreground">{isDevnet ? 'devnet' : 'mainnet'}</strong>{' '}
            only — match your wallet RPC to the same cluster.
          </p>
        </div>
      </div>

      {showFeeWarning && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Launch fee is set to {LAUNCH_FEE_SOL} SOL but no fee destination is configured on
            this deployment — the fee transaction will be skipped until that is enabled.
          </div>
        </div>
      )}

      <Card className="mt-10">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-sol-green" />
                New CPMM pool
              </CardTitle>
              <CardDescription className="mt-2">
                {isDevnet ? (
                  <>
                    Devnet Raydium fees differ; check your simulate result before signing.{' '}
                  </>
                ) : null}
                Mint order for the pool is handled automatically.
              </CardDescription>
            </div>
            <WalletMultiButton />
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="launch-mint">Your token mint (base)</Label>
            <Input
              id="launch-mint"
              data-testid="launch-mint"
              className="font-mono text-sm"
              placeholder="Base mint address (SPL or Token-2022)"
              value={mint}
              onChange={(e) => setMint(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="launch-pair">Pair with</Label>
            <select
              id="launch-pair"
              data-testid="launch-pair"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={quoteKind}
              onChange={(e) =>
                setQuoteKind(e.target.value as LaunchQuoteKind)
              }
            >
              <option value="wsol">SOL</option>
              <option value="usdc">USDC</option>
              <option value="custom">Other token (mint)</option>
            </select>
          </div>

          {quoteKind === 'custom' && (
            <div className="grid gap-2">
              <Label htmlFor="launch-quote-mint">Quote token mint</Label>
              <Input
                id="launch-quote-mint"
                data-testid="launch-quote-mint"
                className="font-mono text-sm"
                placeholder="Mint to pair against (not your base mint)"
                value={quoteCustomMint}
                onChange={(e) => setQuoteCustomMint(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="launch-token-amt">Base token amount to deposit</Label>
            <Input
              id="launch-token-amt"
              data-testid="launch-token-amt"
              placeholder="Human amount (your mint decimals)"
              value={tokenAmt}
              onChange={(e) => setTokenAmt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="launch-quote-amt">{quoteLabel}</Label>
            <Input
              id="launch-quote-amt"
              data-testid="launch-quote-amt"
              placeholder={quotePlaceholder}
              value={quoteAmt}
              onChange={(e) => setQuoteAmt(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              data-testid="launch-submit"
              disabled={busy}
              onClick={onLaunch}
            >
              {busy ? 'Signing…' : 'Create Pool'}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/create">Create token</Link>
            </Button>
          </div>

          {(lastFeeTx || lastPoolTx || lastPool) && (
            <div className="text-sm space-y-2 pt-2 border-t border-border">
              {lastFeeTx && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    RootRecord fee
                  </span>
                  <a
                    href={explorerUrl(lastFeeTx, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-mono text-xs text-sol-green hover:underline break-all"
                  >
                    {lastFeeTx}
                  </a>
                </div>
              )}
              {lastPoolTx && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Pool transaction
                  </span>
                  <a
                    href={explorerUrl(lastPoolTx, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-mono text-xs text-sol-green hover:underline break-all"
                  >
                    {lastPoolTx}
                  </a>
                </div>
              )}
              {lastPool && (
                <a
                  href={explorerUrl(lastPool, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-sol-green hover:underline break-all"
                >
                  Pool address <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LaunchPage() {
  return (
    <Suspense fallback={<div className="container py-20 max-w-2xl" />}>
      <LaunchPageInner />
    </Suspense>
  );
}
