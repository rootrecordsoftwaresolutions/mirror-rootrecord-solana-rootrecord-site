'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import type { ApiV3PoolInfoStandardItemCpmm } from '@raydium-io/raydium-sdk-v2';
import { Droplets, ExternalLink, Info, Rocket } from 'lucide-react';
import { toast } from 'sonner';

import { FundingWarning } from '@/components/FundingWarning';
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
  addCpmmLiquidity,
  createCpmmPoolWithQuote,
  explorerUrl,
  fetchCpmmPoolById,
  type LaunchQuoteKind,
} from '@/lib/raydiumCpmmLaunch';
import { getStoredReferrer } from '@/lib/referral';
import {
  ADD_LIQUIDITY_FEE_SOL,
  isFeeWalletConfigured,
  LAUNCH_FEE_SOL,
  RAYDIUM_MAINNET_CPMM_POOL_CREATE_FEE_SOL,
  SOLANA_NETWORK,
} from '@/lib/solana';

function LiquidityPageInner() {
  const params = useSearchParams();
  const wallet = useWallet();
  const [mint, setMint] = useState('');
  const [tokenAmt, setTokenAmt] = useState('');
  const [quoteKind, setQuoteKind] = useState<LaunchQuoteKind>('wsol');
  const [quoteCustomMint, setQuoteCustomMint] = useState('');
  const [quoteAmt, setQuoteAmt] = useState('');
  const [busyCreate, setBusyCreate] = useState(false);
  const [lastPool, setLastPool] = useState<string | null>(null);
  const [lastPoolTx, setLastPoolTx] = useState<string | null>(null);
  const [lastFeeTx, setLastFeeTx] = useState<string | null>(null);

  const [poolId, setPoolId] = useState('');
  const [loadedPool, setLoadedPool] =
    useState<ApiV3PoolInfoStandardItemCpmm | null>(null);
  const [addBaseIn, setAddBaseIn] = useState(true);
  const [addAmount, setAddAmount] = useState('');
  const [busyLoadPool, setBusyLoadPool] = useState(false);
  const [busyAdd, setBusyAdd] = useState(false);
  const [lastAddTx, setLastAddTx] = useState<string | null>(null);
  const [lastAddFeeTx, setLastAddFeeTx] = useState<string | null>(null);

  useEffect(() => {
    const m = params.get('mint')?.trim();
    if (m) setMint((prev) => (prev.trim() ? prev : m));
    const p = params.get('pool')?.trim();
    if (p) setPoolId((prev) => (prev.trim() ? prev : p));
  }, [params]);

  const feeReady = isFeeWalletConfigured();
  const showFeeWarning =
    !feeReady && (LAUNCH_FEE_SOL > 0 || ADD_LIQUIDITY_FEE_SOL > 0);

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

  const onCreatePool = async () => {
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

    setBusyCreate(true);
    setLastPool(null);
    setLastPoolTx(null);
    setLastFeeTx(null);
    try {
      const { feeTxId, poolTxId, poolId: pid } = await createCpmmPoolWithQuote(
        wallet,
        {
          baseMint: mint.trim(),
          tokenAmount: tokenAmt.trim(),
          quoteKind,
          quoteMint: quoteKind === 'custom' ? quoteCustomMint.trim() : undefined,
          quoteAmount: quoteAmt.trim(),
          referrer: getStoredReferrer(),
        },
      );
      if (feeTxId) setLastFeeTx(feeTxId);
      setLastPoolTx(poolTxId);
      setLastPool(pid);
      toast.success('Pool created — your pair is live on Raydium CPMM');
    } catch (e) {
      toast.error('Pool creation failed', {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusyCreate(false);
    }
  };

  const onLoadPool = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!poolId.trim()) {
      toast.error('Enter the pool address');
      return;
    }
    setBusyLoadPool(true);
    setLoadedPool(null);
    setLastAddTx(null);
    setLastAddFeeTx(null);
    try {
      const pool = await fetchCpmmPoolById(wallet, poolId.trim());
      setLoadedPool(pool);
      toast.success('Pool loaded — choose which side you are depositing');
    } catch (e) {
      toast.error('Could not load pool', {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusyLoadPool(false);
    }
  };

  const onAddLiquidity = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!loadedPool) {
      toast.error('Load a pool first');
      return;
    }
    if (!addAmount.trim()) {
      toast.error('Enter an amount to deposit');
      return;
    }
    setBusyAdd(true);
    setLastAddTx(null);
    setLastAddFeeTx(null);
    try {
      const { feeTxId, txId } = await addCpmmLiquidity(wallet, {
        poolId: loadedPool.id,
        amountHuman: addAmount.trim(),
        baseIn: addBaseIn,
        referrer: getStoredReferrer(),
      });
      if (feeTxId) setLastAddFeeTx(feeTxId);
      setLastAddTx(txId);
      toast.success('Liquidity added');
    } catch (e) {
      toast.error('Add liquidity failed', {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusyAdd(false);
    }
  };

  const isDevnet = SOLANA_NETWORK === 'devnet';
  const mainnetSetupFixedSol =
    RAYDIUM_MAINNET_CPMM_POOL_CREATE_FEE_SOL + LAUNCH_FEE_SOL;

  const addAmountLabel = loadedPool
    ? addBaseIn
      ? `${loadedPool.mintA.symbol} amount to deposit (mint A)`
      : `${loadedPool.mintB.symbol} amount to deposit (mint B)`
    : 'Amount to deposit (human units)';

  return (
    <div className="container py-14 md:py-20 max-w-2xl">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
        Liquidity
      </div>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight">
        Pools & <em className="italic text-sol-green">liquidity</em>
      </h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        Create a new{' '}
        <strong className="text-foreground">Raydium CPMM</strong> pool, or add liquidity to
        a pool that already exists on this cluster. When a RootRecord service fee applies,
        you sign that transaction first, then sign the Raydium pool or deposit transaction.
      </p>

      {!isDevnet && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed rounded-lg border border-border bg-ink-700/25 px-4 py-3">
          <strong className="text-foreground">Mainnet (new pools only):</strong> Total setup
          is about{' '}
          <strong className="text-foreground">
            {mainnetSetupFixedSol.toFixed(2)} SOL
          </strong>{' '}
          plus the liquidity you deposit (same as Raydium). Small Solana network fees
          apply. Adding to an existing pool has no Raydium fixed pool-creation charge; you pay
          Solana fees, optional RootRecord add-liquidity service fee (
          {ADD_LIQUIDITY_FEE_SOL} SOL), and the tokens you deposit.
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
            Service fees are set
            {LAUNCH_FEE_SOL > 0 ? ` (new pool: ${LAUNCH_FEE_SOL} SOL)` : ''}
            {ADD_LIQUIDITY_FEE_SOL > 0 ? ` (add liquidity: ${ADD_LIQUIDITY_FEE_SOL} SOL)` : ''}
            {' '}
            but no fee destination is configured on this deployment — fee transactions will be
            skipped until that is enabled.
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
            <Label htmlFor="liq-mint">Your token mint (base)</Label>
            <Input
              id="liq-mint"
              data-testid="launch-mint"
              className="font-mono text-sm"
              placeholder="Base mint address (SPL or Token-2022)"
              value={mint}
              onChange={(e) => setMint(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="liq-pair">Pair with</Label>
            <select
              id="liq-pair"
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
              <Label htmlFor="liq-quote-mint">Quote token mint</Label>
              <Input
                id="liq-quote-mint"
                data-testid="launch-quote-mint"
                className="font-mono text-sm"
                placeholder="Mint to pair against (not your base mint)"
                value={quoteCustomMint}
                onChange={(e) => setQuoteCustomMint(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="liq-token-amt">Base token amount to deposit</Label>
            <Input
              id="liq-token-amt"
              data-testid="launch-token-amt"
              placeholder="Human amount (your mint decimals)"
              value={tokenAmt}
              onChange={(e) => setTokenAmt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="liq-quote-amt">{quoteLabel}</Label>
            <Input
              id="liq-quote-amt"
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
              disabled={busyCreate}
              onClick={onCreatePool}
            >
              {busyCreate ? 'Signing…' : 'Create Pool'}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/create">Create token</Link>
            </Button>
          </div>

          <FundingWarning />

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

      <Card className="mt-10">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-sol-purple" />
                Add to existing CPMM pool
              </CardTitle>
              <CardDescription className="mt-2">
                Raydium orders mints as <strong className="text-foreground">mint A</strong>{' '}
                and <strong className="text-foreground">mint B</strong> (lexicographic).
                Load the pool, pick which side you are sizing the deposit from, then sign.
                Service charge:{' '}
                <strong className="text-foreground">
                  {ADD_LIQUIDITY_FEE_SOL > 0 ? `${ADD_LIQUIDITY_FEE_SOL} SOL` : 'none'}
                </strong>
                {feeReady && ADD_LIQUIDITY_FEE_SOL > 0
                  ? ' (signed before the Raydium deposit).'
                  : ADD_LIQUIDITY_FEE_SOL > 0
                    ? ' when fee collection is enabled.'
                    : '.'}
              </CardDescription>
            </div>
            <WalletMultiButton />
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="liq-pool-id">Pool address (Raydium CPMM)</Label>
            <Input
              id="liq-pool-id"
              data-testid="add-liq-pool-id"
              className="font-mono text-sm"
              placeholder="Pool / pair state address from Solscan or Raydium"
              value={poolId}
              onChange={(e) => {
                setPoolId(e.target.value);
                setLoadedPool(null);
              }}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            data-testid="add-liq-load-pool"
            disabled={busyLoadPool || !wallet.connected}
            onClick={onLoadPool}
          >
            {busyLoadPool ? 'Loading…' : 'Load pool'}
          </Button>

          {loadedPool && (
            <>
              <div className="rounded-lg border border-border bg-ink-700/30 p-3 text-xs font-mono text-muted-foreground space-y-1">
                <div>
                  <span className="text-foreground/80">Mint A:</span>{' '}
                  {loadedPool.mintA.symbol} · {loadedPool.mintA.address}
                </div>
                <div>
                  <span className="text-foreground/80">Mint B:</span>{' '}
                  {loadedPool.mintB.symbol} · {loadedPool.mintB.address}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="liq-deposit-side">Deposit amount is for</Label>
                <select
                  id="liq-deposit-side"
                  data-testid="add-liq-side"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={addBaseIn ? 'a' : 'b'}
                  onChange={(e) => setAddBaseIn(e.target.value === 'a')}
                >
                  <option value="a">
                    {loadedPool.mintA.symbol} (mint A)
                  </option>
                  <option value="b">
                    {loadedPool.mintB.symbol} (mint B)
                  </option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="liq-add-amt">{addAmountLabel}</Label>
                <Input
                  id="liq-add-amt"
                  data-testid="add-liq-amount"
                  placeholder="e.g. 100 or 0.5"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                />
              </div>

              <Button
                size="lg"
                data-testid="add-liq-submit"
                disabled={busyAdd}
                onClick={onAddLiquidity}
              >
                {busyAdd ? 'Signing…' : 'Add liquidity'}
              </Button>
            </>
          )}

          <FundingWarning />

          {(lastAddFeeTx || lastAddTx) && (
            <div className="text-sm space-y-2 pt-2 border-t border-border">
              {lastAddFeeTx && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    RootRecord fee
                  </span>
                  <a
                    href={explorerUrl(lastAddFeeTx, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-mono text-xs text-sol-green hover:underline break-all"
                  >
                    {lastAddFeeTx}
                  </a>
                </div>
              )}
              {lastAddTx && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Add liquidity transaction
                  </span>
                  <a
                    href={explorerUrl(lastAddTx, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-mono text-xs text-sol-green hover:underline break-all"
                  >
                    {lastAddTx}
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LiquidityPage() {
  return (
    <Suspense fallback={<div className="container py-20 max-w-2xl" />}>
      <LiquidityPageInner />
    </Suspense>
  );
}
