'use client';

import { useState } from 'react';
import { Copy, ExternalLink, CheckCircle2, ShieldOff, Coins, Twitter, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { explorerUrl, solanaFmUrl } from '@/lib/solana';
import { shortAddr } from '@/lib/utils';
import { toast } from 'sonner';

export interface SuccessPayload {
  mint: string;
  signature: string;
  name: string;
  symbol: string;
}

interface Props {
  payload: SuccessPayload | null;
  onClose: () => void;
  onRevokeMint: () => Promise<void>;
  onRevokeFreeze: () => Promise<void>;
  onMintMore: () => void;
  busy: 'mint' | 'freeze' | null;
}

export function SuccessDialog({
  payload,
  onClose,
  onRevokeMint,
  onRevokeFreeze,
  onMintMore,
  busy,
}: Props) {
  const [revokedMint, setRevokedMint] = useState(false);
  const [revokedFreeze, setRevokedFreeze] = useState(false);
  if (!payload) return null;

  const tweet = encodeURIComponent(
    `Just launched $${payload.symbol} (${payload.name}) on Solana via @rootrecord_info — cheap, fast, no-BS token creation. Mint: ${payload.mint}`,
  );
  const share = `https://twitter.com/intent/tweet?text=${tweet}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleRevokeMint = async () => {
    await onRevokeMint();
    setRevokedMint(true);
  };
  const handleRevokeFreeze = async () => {
    await onRevokeFreeze();
    setRevokedFreeze(true);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-testid="success-dialog"
        className="max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-sol-green mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs uppercase tracking-[0.16em]">
              Token launched
            </span>
          </div>
          <DialogTitle className="font-display text-3xl">
            ${payload.symbol} is live on Solana
          </DialogTitle>
          <DialogDescription>
            <em>{payload.name}</em> was created in a single signed transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-ink-700/40 p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Mint address
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span
              data-testid="success-mint-addr"
              className="font-mono text-sm break-all"
            >
              {payload.mint}
            </span>
            <button
              data-testid="copy-mint"
              onClick={() => copy(payload.mint, 'Mint')}
              className="text-muted-foreground hover:text-sol-green transition shrink-0"
              aria-label="Copy mint address"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" size="sm" data-testid="open-solscan">
            <a
              href={explorerUrl(payload.mint, 'address')}
              target="_blank"
              rel="noreferrer"
            >
              Solscan <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" data-testid="open-solfm">
            <a
              href={solanaFmUrl(payload.mint, 'address')}
              target="_blank"
              rel="noreferrer"
            >
              Solana.fm <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Recommended next steps
          </div>
          <div className="grid gap-2">
            <Button
              variant="outline"
              data-testid="revoke-mint-btn"
              onClick={handleRevokeMint}
              disabled={revokedMint || busy === 'mint'}
              className="justify-between"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldOff className="h-4 w-4" /> Revoke mint authority
              </span>
              <span className="text-xs text-muted-foreground">
                {revokedMint
                  ? 'Done'
                  : busy === 'mint'
                    ? 'Sending…'
                    : '0.01 SOL'}
              </span>
            </Button>
            <Button
              variant="outline"
              data-testid="revoke-freeze-btn"
              onClick={handleRevokeFreeze}
              disabled={revokedFreeze || busy === 'freeze'}
              className="justify-between"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldOff className="h-4 w-4" /> Revoke freeze authority
              </span>
              <span className="text-xs text-muted-foreground">
                {revokedFreeze
                  ? 'Done'
                  : busy === 'freeze'
                    ? 'Sending…'
                    : '0.01 SOL'}
              </span>
            </Button>
            <Button
              variant="ghost"
              data-testid="mint-more-btn"
              onClick={onMintMore}
              className="justify-between"
            >
              <span className="inline-flex items-center gap-2">
                <Coins className="h-4 w-4" /> Mint additional tokens
              </span>
              <span className="text-xs text-muted-foreground">Open tool</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between pt-3 gap-3">
          <div className="text-xs text-muted-foreground">
            Tx: <span className="font-mono">{shortAddr(payload.signature, 6)}</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="purple" size="sm" data-testid="share-x">
              <a href={share} target="_blank" rel="noreferrer">
                <Twitter className="h-3.5 w-3.5" /> Share on X
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              data-testid="close-success"
            >
              <X className="h-3.5 w-3.5" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
