'use client';

import { Suspense, useEffect, useState } from 'react';
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

import { createCpmmPoolWithSol, explorerUrl } from '@/lib/raydiumCpmmLaunch';
import { SOLANA_NETWORK } from '@/lib/solana';

function LaunchPageInner() {
  const params = useSearchParams();
  const wallet = useWallet();
  const [mint, setMint] = useState('');
  const [tokenAmt, setTokenAmt] = useState('');
  const [solAmt, setSolAmt] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastPool, setLastPool] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  useEffect(() => {
    const m = params.get('mint')?.trim();
    if (m) setMint((prev) => (prev.trim() ? prev : m));
  }, [params]);

  const onLaunch = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!mint.trim()) {
      toast.error('Enter your token mint address');
      return;
    }
    if (!tokenAmt.trim() || !solAmt.trim()) {
      toast.error('Enter both starting amounts');
      return;
    }

    setBusy(true);
    setLastPool(null);
    setLastTx(null);
    try {
      const { txId, poolId } = await createCpmmPoolWithSol(wallet, {
        baseMint: mint.trim(),
        tokenAmount: tokenAmt.trim(),
        solAmount: solAmt.trim(),
      });
      setLastTx(txId);
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
        wrapped SOL, with the initial deposit in a single signed transaction. Swaps route
        through Raydium like any other pool — you never have to use the Raydium website for
        this setup.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-ink-700/30 p-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-sol-purple" />
        <div className="space-y-2">
          <p>
            You must already hold the token in your wallet (ATA). SOL is consumed from your
            balance (auto-wrap). Raydium charges an on-chain pool-creation fee; you also pay
            Solana network fees.
          </p>
          <p>
            This flow is for{' '}
            <strong className="text-foreground">{isDevnet ? 'devnet' : 'mainnet'}</strong>{' '}
            only — match your wallet RPC to the same cluster.
          </p>
        </div>
      </div>

      <Card className="mt-10">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-sol-green" />
                New CPMM pool (token / SOL)
              </CardTitle>
              <CardDescription className="mt-2">
                Mint order is handled automatically (Raydium requires sorted mint keys).
              </CardDescription>
            </div>
            <WalletMultiButton />
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="launch-mint">Your token mint</Label>
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
            <Label htmlFor="launch-token-amt">Token amount to deposit</Label>
            <Input
              id="launch-token-amt"
              data-testid="launch-token-amt"
              placeholder="e.g. 1000000 (uses your mint decimals)"
              value={tokenAmt}
              onChange={(e) => setTokenAmt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="launch-sol-amt">SOL paired into the pool</Label>
            <Input
              id="launch-sol-amt"
              data-testid="launch-sol-amt"
              placeholder="e.g. 0.5"
              value={solAmt}
              onChange={(e) => setSolAmt(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              data-testid="launch-submit"
              disabled={busy}
              onClick={onLaunch}
            >
              {busy ? 'Signing…' : 'Create pool & add liquidity'}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/create">Create token</Link>
            </Button>
          </div>

          {(lastTx || lastPool) && (
            <div className="text-sm space-y-2 pt-2 border-t border-border">
              {lastTx && (
                <a
                  href={explorerUrl(lastTx, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-sol-green hover:underline break-all"
                >
                  Transaction <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
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
