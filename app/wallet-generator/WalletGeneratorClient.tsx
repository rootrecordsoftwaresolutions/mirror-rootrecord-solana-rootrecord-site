'use client';

import { useCallback, useState } from 'react';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import QRCode from 'react-qr-code';
import { Printer, RefreshCw, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PaperWalletRow = {
  publicKey: string;
  privateKeyB58: string;
  fingerprintHex: string;
};

function generateBatch(): PaperWalletRow[] {
  return Array.from({ length: 4 }, () => {
    const kp = Keypair.generate();
    const publicKey = kp.publicKey.toBase58();
    const bytes = new PublicKey(publicKey).toBytes();
    const fingerprintHex = Array.from(bytes.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    return {
      publicKey,
      privateKeyB58: bs58.encode(kp.secretKey),
      fingerprintHex,
    };
  });
}

function QrBox({
  label,
  accent,
  value,
  footnote,
}: {
  label: string;
  accent: 'green' | 'purple';
  value: string;
  footnote: string;
}) {
  const accentRing =
    accent === 'green'
      ? 'ring-2 ring-sol-green/50 shadow-[0_0_0_1px_rgba(20,241,149,0.2)]'
      : 'ring-2 ring-sol-purple/50 shadow-[0_0_0_1px_rgba(153,69,255,0.2)]';
  const labelClass = accent === 'green' ? 'text-sol-green' : 'text-sol-purple';

  return (
    <div className="flex min-w-0 flex-col items-center gap-2.5">
      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-[0.12em]',
          labelClass,
        )}
      >
        {label}
      </span>
      <div className={cn('rounded-lg bg-white p-2.5 print:p-2', accentRing)}>
        <QRCode value={value} size={112} level="M" className="h-28 w-28 print:h-24 print:w-24" />
      </div>
      <p className="max-w-[9.5rem] text-center text-[9px] text-muted-foreground print:max-w-[8.5rem]">
        {footnote}
      </p>
    </div>
  );
}

function PaperWalletCard({ row, index }: { row: PaperWalletRow; index: number }) {
  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-ink-800/80',
        'print:break-inside-avoid print:border-white/20 print:shadow-none',
      )}
    >
      <div
        className="h-1.5 w-full print-color-adjust-exact"
        style={{
          background: 'linear-gradient(90deg, #14F195 0%, #9945FF 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] print:opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(20, 241, 149, 0.15) 0%, transparent 45%),
            linear-gradient(315deg, rgba(153, 69, 255, 0.15) 0%, transparent 45%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full border border-white/5"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full border border-sol-green/10"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-2 border-b border-border/60 px-4 pb-1 pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            RootRecord <span className="text-foreground/90">paper wallet</span>
          </div>
          <div className="mt-0.5 font-display text-lg tracking-tight text-foreground">
            <em className="not-italic text-sol-green">Solana</em> · address{' '}
            <span className="not-italic text-sol-purple"> #{index + 1}</span>
          </div>
        </div>
        <div className="max-w-[40%] break-all text-right text-[9px] font-mono leading-tight text-muted-foreground">
          <div className="text-[8px] uppercase tracking-widest">Fingerprint</div>
          <div className="tracking-wide text-foreground/90">{row.fingerprintHex}</div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-wrap items-stretch justify-center gap-4 px-3 py-4 sm:gap-6 sm:px-5 sm:py-5 print:px-2 print:py-2">
        <QrBox
          label="Public — receive"
          accent="green"
          value={row.publicKey}
          footnote="Scan to share your address. Safe to show."
        />
        <div className="hidden w-px self-stretch bg-border/60 sm:block print:block" />
        <QrBox
          label="Private key"
          accent="purple"
          value={row.privateKeyB58}
          footnote="Import in a wallet. Anyone with this can spend."
        />
      </div>

      <div className="relative space-y-2.5 border-t border-border/60 bg-ink-900/50 px-3 py-3 sm:px-4 print:px-3 print:py-2.5">
        <div>
          <div className="mb-1 text-[8px] uppercase tracking-[0.14em] text-sol-green/90">
            Public key (base58)
          </div>
          <p className="break-all font-mono text-[9px] leading-relaxed text-foreground/95 sm:text-[10px]">
            {row.publicKey}
          </p>
        </div>
        <div>
          <div className="mb-1 text-[8px] uppercase tracking-[0.14em] text-sol-purple/90">
            Secret key (base58, 64-byte keypair)
          </div>
          <p className="break-all font-mono text-[8px] leading-relaxed text-foreground/90 sm:text-[9px]">
            {row.privateKeyB58}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WalletGeneratorClient() {
  const [wallets, setWallets] = useState<PaperWalletRow[]>(() => generateBatch());

  const regenerate = useCallback(() => {
    setWallets(generateBatch());
  }, []);

  const print = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.print();
  }, []);

  return (
    <div className="container relative py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 bg-aurora" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-faint-bg opacity-40" />

      <div
        id="wallet-paper-print-root"
        className="wallet-paper-print-root mx-auto max-w-4xl print-color-adjust-exact"
      >
        <div className="mb-2 text-center print:hidden">
          <Badge className="mb-2">Offline-ready</Badge>
        </div>
        <div className="mb-4 text-center print:mb-3 print:hidden">
          <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Wallet <em className="not-italic text-sol-green">Generator</em>
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Four fresh Solana keypairs are generated in your browser. Print this sheet, cut the
            cards, and store the private side like cash—anyone with the private key or QR can move
            funds.
          </p>
        </div>
        <div className="wallet-gen-no-print mb-6 flex flex-col flex-wrap items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button type="button" onClick={regenerate} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Generate new set
          </Button>
          <Button type="button" onClick={print} className="gap-2">
            <Printer className="h-4 w-4" />
            Print sheet
          </Button>
        </div>
        <div className="wallet-gen-no-print mb-8 max-w-2xl mx-auto rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex gap-2 text-sm text-foreground/95">
            <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <p>
              Keys never leave this tab until you print or copy them. Clear your printouts from
              shared devices. Losing the private key means losing access; exposing it means losing
              funds.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 print:grid-cols-2 print:gap-3">
          {wallets.map((w, i) => (
            <PaperWalletCard key={`${w.publicKey}-${i}`} row={w} index={i} />
          ))}
        </div>
        <p className="mt-6 hidden text-center text-xs text-muted-foreground print:mt-4 print:block print:text-[9px]">
          solana.rootrecord.info · paper wallet — generated locally in your browser
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground/80 print:hidden">
          Fingerprint: first 8 bytes of the public key (hex), for quick visual matching.
        </p>
      </div>
    </div>
  );
}
