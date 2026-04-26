import Link from 'next/link';
import { Check, Flame, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ROWS = [
  { action: 'Create SPL token + Metaplex metadata', us: '0.025 SOL', them: '0.05 – 0.10 SOL', onchain: '~0.01 SOL' },
  { action: 'Revoke mint authority', us: '0.01 SOL', them: '0.02 – 0.05 SOL', onchain: '~0.000005 SOL' },
  { action: 'Revoke freeze authority', us: '0.01 SOL', them: '0.02 – 0.05 SOL', onchain: '~0.000005 SOL' },
  { action: 'Mint additional supply', us: '0.01 SOL', them: '0.02 – 0.05 SOL', onchain: '~0.000005 SOL' },
  { action: 'Update metadata', us: '0.01 SOL', them: '0.02 – 0.10 SOL', onchain: '~0.000005 SOL' },
];

export const metadata = {
  title: 'Pricing',
  description:
    'Roughly half what every other Solana token tool charges. Pay once per action — no subscriptions.',
};

export default function PricingPage() {
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          03 / Pricing
        </div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight">
          Pay <em className="italic text-sol-green">once</em>.{' '}
          Per <em className="italic">action</em>.{' '}
          That&apos;s it.
        </h1>
        <p className="mt-5 text-muted-foreground max-w-2xl">
          No subscriptions. No premium tiers. No bundled features you didn&apos;t
          ask for. The platform fee for each action is published right next to
          the real on-chain cost — so you can see exactly where your SOL goes.
        </p>
      </div>

      <div className="mt-12">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-sol-green" /> Live pricing
              </CardTitle>
              <Badge>Mainnet · January 2026</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-12 px-6 py-4 text-xs uppercase tracking-[0.14em] text-muted-foreground border-t border-border">
              <div className="col-span-5">Action</div>
              <div className="col-span-2 text-right">RootRecord</div>
              <div className="col-span-3 text-right">Competitors</div>
              <div className="col-span-2 text-right">On-chain</div>
            </div>
            {ROWS.map((r) => (
              <div
                key={r.action}
                className="grid grid-cols-12 px-6 py-5 text-sm items-center border-t border-border"
              >
                <div className="col-span-5">{r.action}</div>
                <div className="col-span-2 text-right font-mono text-sol-green">
                  {r.us}
                </div>
                <div className="col-span-3 text-right font-mono text-muted-foreground line-through decoration-rose-500/40">
                  {r.them}
                </div>
                <div className="col-span-2 text-right font-mono text-muted-foreground">
                  {r.onchain}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {[
          {
            t: 'No subscriptions',
            d: 'You only pay when you take an action. No monthly bill, no recurring charge.',
            yes: true,
          },
          {
            t: 'No upsells',
            d: 'No premium tier for revoking authority or updating metadata. Same flat fee.',
            yes: true,
          },
          {
            t: 'No keys touched',
            d: 'Your wallet signs every transaction. RootRecord never sees your private key.',
            yes: true,
          },
        ].map((p) => (
          <Card key={p.t}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {p.yes ? (
                  <Check className="h-4 w-4 text-sol-green" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                )}
                <CardTitle className="text-base">{p.t}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.d}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap gap-4">
        <Button asChild size="lg">
          <Link href="/create">Create a token</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/tools">Open the toolset</Link>
        </Button>
      </div>
    </div>
  );
}
