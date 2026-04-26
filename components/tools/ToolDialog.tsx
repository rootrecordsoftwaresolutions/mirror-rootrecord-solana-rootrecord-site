'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  revokeMintAuthority,
  revokeFreezeAuthority,
  mintMore,
  updateTokenMetadata,
  ACTION_FEE_SOL,
  explorerUrl,
} from '@/lib/solana';
import {
  withdrawWithheldFromMint,
  harvestWithheldToMint,
  updateTransferFee,
} from '@/lib/token2022';
import { parseSupply } from '@/lib/utils';

export type ToolKind =
  | 'revoke-mint'
  | 'revoke-freeze'
  | 'mint-more'
  | 'update-metadata'
  | 'withdraw-fees'
  | 'harvest-fees'
  | 'update-fee-config';

const META: Record<
  ToolKind,
  { title: string; desc: string; cta: string; t2022?: boolean }
> = {
  'revoke-mint': {
    title: 'Revoke mint authority',
    desc: 'Sets the mint authority to null. Locks total supply forever — no one can mint more after this. Works on legacy SPL and Token-2022.',
    cta: `Revoke · ${ACTION_FEE_SOL} SOL`,
  },
  'revoke-freeze': {
    title: 'Revoke freeze authority',
    desc: 'Removes the ability for anyone to freeze token accounts. Important signal for buyers.',
    cta: `Revoke · ${ACTION_FEE_SOL} SOL`,
  },
  'mint-more': {
    title: 'Mint more tokens',
    desc: 'Mint additional supply to your wallet. Only works while the mint authority is still active.',
    cta: `Mint · ${ACTION_FEE_SOL} SOL`,
  },
  'update-metadata': {
    title: 'Update metadata (legacy)',
    desc: 'Change the name, symbol, or off-chain JSON URI for a legacy SPL token. Requires the metadata to be mutable.',
    cta: `Update · ${ACTION_FEE_SOL} SOL`,
  },
  'withdraw-fees': {
    title: 'Withdraw transfer fees',
    desc: 'Pull all withheld transfer fees from the mint into a destination account you own. Token-2022 only.',
    cta: `Withdraw · ${ACTION_FEE_SOL} SOL`,
    t2022: true,
  },
  'harvest-fees': {
    title: 'Harvest fees from accounts → mint',
    desc: 'Sweep withheld fees from a list of token accounts back into the mint, where you can withdraw them. Token-2022 only.',
    cta: `Harvest · ${ACTION_FEE_SOL} SOL`,
    t2022: true,
  },
  'update-fee-config': {
    title: 'Update transfer fee config',
    desc: 'Change the transfer fee basis points and / or maximum fee. Takes effect after 2 epochs. Token-2022 only.',
    cta: `Update · ${ACTION_FEE_SOL} SOL`,
    t2022: true,
  },
};

interface Props {
  kind: ToolKind | null;
  initialMint?: string;
  onClose: () => void;
}

export function ToolDialog({ kind, initialMint, onClose }: Props) {
  const wallet = useWallet();
  const [mint, setMint] = useState(initialMint ?? '');
  const [amount, setAmount] = useState('');
  const [decimals, setDecimals] = useState('9');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [uri, setUri] = useState('');
  const [destination, setDestination] = useState('');
  const [accountList, setAccountList] = useState('');
  const [feeBps, setFeeBps] = useState('500');
  const [maxFee, setMaxFee] = useState('1000000');
  const [busy, setBusy] = useState(false);

  if (!kind) return null;
  const meta = META[kind];

  const reset = () => {
    setMint('');
    setAmount('');
    setDecimals('9');
    setName('');
    setSymbol('');
    setUri('');
    setDestination('');
    setAccountList('');
    setFeeBps('500');
    setMaxFee('1000000');
  };

  const handle = async () => {
    if (!wallet.connected) {
      toast.error('Connect a wallet first');
      return;
    }
    if (!mint) {
      toast.error('Mint address is required');
      return;
    }
    setBusy(true);
    try {
      let sig = '';
      if (kind === 'revoke-mint') sig = await revokeMintAuthority(wallet, mint);
      else if (kind === 'revoke-freeze')
        sig = await revokeFreezeAuthority(wallet, mint);
      else if (kind === 'mint-more') {
        if (!amount) throw new Error('Amount is required');
        sig = await mintMore(
          wallet,
          mint,
          parseSupply(amount),
          parseInt(decimals, 10) || 9,
        );
      } else if (kind === 'update-metadata') {
        if (!name || !symbol)
          throw new Error('Name and symbol are required');
        sig = await updateTokenMetadata(wallet, mint, { name, symbol, uri });
      } else if (kind === 'withdraw-fees') {
        sig = await withdrawWithheldFromMint(
          wallet,
          mint,
          destination || undefined,
        );
      } else if (kind === 'harvest-fees') {
        const list = accountList
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (!list.length) throw new Error('Provide at least one token account');
        sig = await harvestWithheldToMint(wallet, mint, list);
      } else if (kind === 'update-fee-config') {
        sig = await updateTransferFee(
          wallet,
          mint,
          parseInt(feeBps, 10) || 0,
          BigInt(maxFee || '0'),
        );
      }
      toast.success('Transaction confirmed', {
        description: 'View on Solscan',
        action: {
          label: 'Open',
          onClick: () => window.open(explorerUrl(sig), '_blank'),
        },
      });
      reset();
      onClose();
    } catch (e) {
      toast.error('Transaction failed', {
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-testid={`tool-dialog-${kind}`}
        className="max-w-md max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.desc}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Mint address</Label>
            <Input
              data-testid="tool-mint-input"
              placeholder="Mint pubkey"
              value={mint}
              onChange={(e) => setMint(e.target.value.trim())}
            />
          </div>

          {kind === 'mint-more' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input
                  data-testid="tool-amount-input"
                  placeholder="1,000,000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Decimals</Label>
                <Input
                  data-testid="tool-decimals-input"
                  type="number"
                  value={decimals}
                  onChange={(e) => setDecimals(e.target.value)}
                />
              </div>
            </div>
          )}

          {kind === 'update-metadata' && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>New name</Label>
                  <Input
                    data-testid="tool-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>New symbol</Label>
                  <Input
                    data-testid="tool-symbol-input"
                    value={symbol}
                    onChange={(e) =>
                      setSymbol(e.target.value.toUpperCase().slice(0, 10))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Metadata URI</Label>
                <Input
                  data-testid="tool-uri-input"
                  placeholder="https://gateway.pinata.cloud/ipfs/…"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                />
              </div>
            </>
          )}

          {kind === 'withdraw-fees' && (
            <div className="grid gap-2">
              <Label>Destination owner (optional)</Label>
              <Input
                data-testid="tool-dest-input"
                placeholder="Defaults to your wallet"
                value={destination}
                onChange={(e) => setDestination(e.target.value.trim())}
              />
              <span className="text-[11px] text-muted-foreground">
                We&apos;ll create the destination&apos;s associated token
                account if it doesn&apos;t exist yet.
              </span>
            </div>
          )}

          {kind === 'harvest-fees' && (
            <div className="grid gap-2">
              <Label>Token account addresses</Label>
              <Textarea
                data-testid="tool-accounts-input"
                rows={4}
                placeholder="Paste one or more associated token accounts, separated by commas, spaces, or newlines."
                value={accountList}
                onChange={(e) => setAccountList(e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground">
                Sweeps any withheld fees on these accounts back into the mint.
              </span>
            </div>
          )}

          {kind === 'update-fee-config' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>New fee (bps)</Label>
                <Input
                  data-testid="tool-bps-input"
                  type="number"
                  min={0}
                  max={10000}
                  value={feeBps}
                  onChange={(e) => setFeeBps(e.target.value)}
                />
                <span className="text-[11px] text-muted-foreground">
                  100 bps = 1%
                </span>
              </div>
              <div className="grid gap-2">
                <Label>New max fee</Label>
                <Input
                  data-testid="tool-maxfee-input"
                  type="number"
                  value={maxFee}
                  onChange={(e) => setMaxFee(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            data-testid="tool-submit"
            onClick={handle}
            disabled={busy}
            variant={
              kind.startsWith('revoke') ? 'destructive' : 'default'
            }
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              meta.cta
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
