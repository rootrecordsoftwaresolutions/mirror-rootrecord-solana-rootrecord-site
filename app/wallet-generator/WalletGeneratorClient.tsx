'use client';

import { useCallback, useId, useState } from 'react';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import QRCode from 'react-qr-code';
import { Printer, RefreshCw, Scissors, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PaperWalletRow = {
  publicKey: string;
  privateKeyB58: string;
  fingerprintHex: string;
};

function generateOne(): PaperWalletRow {
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
}

function SolanaMark({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, '');
  const gradId = `sol-g-${gid}`;
  return (
    <svg
      viewBox="0 0 72 56"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#9945FF" />
        </linearGradient>
      </defs>
      {/* Screen: filled gradient bars */}
      <g className="print:hidden" transform="skewX(-8)">
        <rect x="6" y="8" width="56" height="9" rx="2" fill={`url(#${gradId})`} />
        <rect x="6" y="22" width="56" height="9" rx="2" fill={`url(#${gradId})`} opacity={0.85} />
        <rect x="6" y="36" width="56" height="9" rx="2" fill={`url(#${gradId})`} opacity={0.7} />
      </g>
      {/* Print: outline only — minimal ink */}
      <g
        className="hidden print:block"
        transform="skewX(-8)"
        fill="none"
        stroke="#525252"
        strokeWidth="1.75"
        strokeLinecap="round"
      >
        <rect x="6" y="8" width="56" height="9" rx="2" />
        <rect x="6" y="22" width="56" height="9" rx="2" />
        <rect x="6" y="36" width="56" height="9" rx="2" />
      </g>
    </svg>
  );
}

function FoldRule({ label }: { label: string }) {
  return (
    <div
      className={cn(
        'relative flex h-7 shrink-0 items-center justify-center gap-2 border-y border-dashed border-white/35',
        'bg-ink-900/90 print:h-6 print:border-neutral-400 print:bg-white',
      )}
      aria-hidden
    >
      <Scissors className="h-3.5 w-3.5 text-muted-foreground print:text-neutral-500" />
      <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground print:text-[8px] print:text-neutral-700">
        {label}
      </span>
      <Scissors className="h-3.5 w-3.5 text-muted-foreground print:text-neutral-500" />
    </div>
  );
}

/** Tent strip: top = public (rotated 180°), middle = private, bottom = branding — fold private behind branding, then fold public to ridge. */
function TentFoldWallet({ row }: { row: PaperWalletRow }) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[420px] overflow-hidden rounded-xl border border-border shadow-lg',
        'print:max-w-[178mm] print:rounded-none print:border print:border-dashed print:border-neutral-500 print:shadow-none',
        'print-economy-sheet',
      )}
    >
      {/* Cut border hint */}
      <div className="border-b border-border/60 bg-ink-900/80 px-3 py-1.5 text-center print:border-neutral-300 print:bg-white print:py-1">
        <p className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground print:text-[7px] print:text-neutral-600">
          Cut outer dashed border · one wallet per sheet
        </p>
      </div>

      {/* —— Panel 1: Public (reads upright from opposite side of tent) —— */}
      <div
        className={cn(
          'relative bg-[#f4f6fa] text-ink-900 print:flex print:min-h-[92mm] print:flex-col print:justify-center print:bg-white',
        )}
        style={{ transform: 'rotate(180deg)' }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] print:hidden">
          <div
            className="absolute -right-6 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, #9945FF 0%, transparent 70%)' }}
          />
        </div>
        <div className="relative px-4 pb-5 pt-4 print:px-6 print:pb-6 print:pt-5">
          <div className="mb-3 flex items-start justify-between gap-3 print:mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-900/70 print:text-[11px]">
                Scan public address
              </p>
              <p className="mt-1 font-mono text-[9px] leading-snug text-ink-900/90 print:text-[9px]">
                {row.publicKey}
              </p>
            </div>
            <SolanaMark className="h-12 w-14 opacity-40 print:h-12 print:w-14" />
          </div>
          <div className="mx-auto flex w-fit rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 print:p-4 print:shadow-none print:ring-1 print:ring-neutral-300">
            <QRCode value={row.publicKey} size={140} level="M" className="h-36 w-36 print:h-44 print:w-44" />
          </div>
          <p className="mt-3 text-center text-[9px] text-ink-900/55 print:mt-4 print:text-[10px]">
            Scan to receive SOL &amp; tokens
          </p>
        </div>
      </div>

      <FoldRule label="Fold 2 — tent ridge (meet with branding face)" />

      {/* —— Panel 2: Private (sandwiched inside when assembled) —— */}
      <div
        className={cn(
          'relative border-x border-sol-purple/30 bg-gradient-to-b from-ink-800 to-ink-900',
          'print:flex print:min-h-[68mm] print:flex-col print:justify-center print:border-x print:border-neutral-400 print:bg-neutral-50',
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(153,69,255,0.06),transparent)] print:hidden" />
        <div className="relative px-3 py-4 text-center print:px-5 print:py-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sol-purple print:text-[10px] print:text-neutral-800">
            Concealed · private key
          </p>
          <p className="mx-auto mt-1 max-w-[18rem] text-[8px] leading-relaxed text-muted-foreground print:max-w-[38rem] print:text-[8px] print:text-neutral-600">
            Fold this section behind the branding panel first (Fold 1). It stays inside the tent.
          </p>
          <div className="mx-auto mt-3 flex w-fit rounded-lg bg-white p-2 ring-2 ring-sol-purple/40 print:mt-3 print:p-2.5 print:ring-1 print:ring-neutral-400">
            <QRCode value={row.privateKeyB58} size={100} level="M" className="h-[100px] w-[100px] print:h-32 print:w-32" />
          </div>
          <p className="mx-auto mt-2 max-w-[20rem] break-all font-mono text-[7px] leading-relaxed text-foreground/85 print:max-w-[38rem] print:text-[7px] print:text-neutral-800">
            {row.privateKeyB58}
          </p>
        </div>
      </div>

      <FoldRule label="Fold 1 — tuck private behind branding" />

      {/* —— Panel 3: Branding + amount (outward face of tent) —— */}
      <div className="relative overflow-hidden bg-ink-800 print:flex print:min-h-[72mm] print:flex-col print:justify-center print:border-t print:border-neutral-200 print:bg-white">
        <div
          className="absolute inset-0 opacity-30 print:hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(20,241,149,0.2) 0%, transparent 42%), linear-gradient(315deg, rgba(153,69,255,0.18) 0%, transparent 45%)',
          }}
        />
        {/* Print: single slim accent line (saves ink vs full gradient) */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 hidden h-0.5 print:block print:bg-neutral-700"
          aria-hidden
        />
        <div className="absolute bottom-0 right-0 top-0 flex w-12 flex-col border-l border-white/10 bg-ink-900/50 py-3 print:w-11 print:border-neutral-300 print:bg-neutral-100 print:py-2">
          <div
            className="flex flex-1 flex-col items-center justify-center gap-3 text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground print:text-[7px] print:text-neutral-600"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            <span className="text-foreground/90 print:text-neutral-900">Amount</span>
            <span className="text-sol-green print:text-neutral-800">SOL</span>
          </div>
          <div
            className="mx-auto mb-2 h-20 w-px border-l border-dashed border-white/30 print:h-16 print:border-neutral-400"
            title="Hand-write balance"
          />
        </div>
        <div className="relative flex items-center gap-4 pr-14 pl-5 py-6 print:gap-4 print:pr-14 print:pl-6 print:py-6">
          <SolanaMark className="h-16 w-20 print:h-[4.5rem] print:w-[5.5rem]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground print:text-[11px] print:text-neutral-600">
              RootRecord
            </p>
            <h2 className="font-display text-3xl tracking-tight text-foreground print:text-3xl print:text-neutral-900">
              <span className="text-sol-green print:text-neutral-900">Solana</span>{' '}
              <span className="text-lg font-sans font-normal text-muted-foreground print:text-base print:text-neutral-600">
                paper wallet
              </span>
            </h2>
            <p className="mt-1 font-mono text-[9px] text-muted-foreground print:text-[8px] print:text-neutral-500">
              ID {row.fingerprintHex}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WalletGeneratorClient() {
  const [wallet, setWallet] = useState<PaperWalletRow>(() => generateOne());

  const regenerate = useCallback(() => {
    setWallet(generateOne());
  }, []);

  const print = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.print();
  }, []);

  return (
    <div className="container relative py-10 md:py-14 print:max-w-none print:w-full print:px-6 print:py-0">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 bg-aurora" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-faint-bg opacity-40" />

      <div
        id="wallet-paper-print-root"
        className="wallet-paper-print-root mx-auto max-w-2xl print:max-w-none print-economy-sheet"
      >
        <div className="mb-2 text-center print:hidden">
          <Badge className="mb-2">Tent-fold · one per page</Badge>
        </div>
        <div className="mb-4 text-center print:mb-3 print:hidden">
          <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Wallet <em className="not-italic text-sol-green">Generator</em>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            One Solana keypair per sheet, shaped like a classic tent-fold paper wallet: public address on
            one face, RootRecord branding on the other, private key on the middle band you tuck inside
            before folding the ridge.
          </p>
        </div>
        <div className="wallet-gen-no-print mb-6 flex flex-col flex-wrap items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button type="button" onClick={regenerate} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            New wallet
          </Button>
          <Button type="button" onClick={print} className="gap-2">
            <Printer className="h-4 w-4" />
            Print sheet
          </Button>
        </div>

        <div className="wallet-gen-no-print mb-6 max-w-xl mx-auto rounded-lg border border-border bg-ink-800/60 px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Assembly</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed">
            <li>
              Along <strong className="text-foreground">Fold 1</strong>, fold the <strong className="text-foreground">middle (private)</strong>{' '}
              section backward behind the <strong className="text-foreground">branding</strong> panel so the secret faces the back of that panel.
            </li>
            <li>
              Along <strong className="text-foreground">Fold 2</strong>, bring the <strong className="text-foreground">address</strong> panel down to meet the ridge so the tent stands: branding on one slope, public QR on the other. The private strip stays sandwiched inside.
            </li>
            <li>Optional: tape the open long edges. Hand-write your balance on the vertical Amount line.</li>
          </ol>
        </div>

        <div className="wallet-gen-no-print mb-6 max-w-2xl mx-auto rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex gap-2 text-sm text-foreground/95">
            <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <p>
              Keys stay in this tab until you print. Treat the private band like cash—anyone with the QR or
              base58 string can spend everything in this address.
            </p>
          </div>
        </div>

        <div className="wallet-page-print-shell">
          <div className="flex justify-center print:px-0">
            <TentFoldWallet row={wallet} />
          </div>

          <p className="mt-8 hidden shrink-0 text-center text-xs text-muted-foreground print:mt-6 print:block print:text-[9px] print:text-neutral-500">
            solana.rootrecord.info · tri-fold paper wallet
          </p>
        </div>
      </div>
    </div>
  );
}
