import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Docs' };

const SECTIONS = [
  {
    n: '01',
    title: 'Connecting your wallet',
    body: 'Click "Select Wallet" in the top right. Phantom, Solflare and any wallet implementing the Wallet Standard (Backpack, Glow, etc.) will appear automatically. We never request your seed phrase or private key.',
  },
  {
    n: '02',
    title: 'Creating a token',
    body: 'Fill in the form on /create. We upload your logo and metadata to IPFS via Pinata, then build a single Solana transaction that creates the mint, mints the full supply to your wallet, registers Metaplex metadata, and includes our 0.025 SOL platform fee. You sign once.',
  },
  {
    n: '03',
    title: 'Revoking authorities',
    body: 'After launch you almost always want to revoke the mint authority (so no more supply can ever be minted) and the freeze authority (so accounts can\'t be frozen). Both are one-click actions on /tools, billed at 0.01 SOL.',
  },
  {
    n: '04',
    title: 'Minting more / updating metadata',
    body: 'Mint authority must still be active to mint more. Metadata can be updated as long as the mint authority hasn\'t marked it immutable. Each action is a separate signed transaction.',
  },
  {
    n: '05',
    title: 'Token-2022 mode',
    body: 'On /create, toggle "Token-2022 mode" to access seven on-chain extensions: transfer fee (% on every transfer, withheld in the mint), transfer hook (custom program executed on every transfer), non-transferable (soulbound), mint close authority, permanent delegate (compliance), interest-bearing (display-only APY), and default-frozen accounts. When enabled, metadata is stored directly inside the mint via the in-mint TokenMetadata extension — no Metaplex tx needed.',
  },
  {
    n: '06',
    title: 'Withdraw / harvest transfer fees',
    body: 'For Token-2022 mints with the transfer fee extension, fees accumulate in two places: (a) inside individual holder accounts as they transact, and (b) on the mint itself once "harvested". Use /tools → Harvest fees to sweep account-level fees onto the mint, then Withdraw transfer fees to pull them into a wallet you own.',
  },
  {
    n: '07',
    title: 'Referrals',
    body: 'Share any RootRecord URL with ?ref=YOUR_WALLET. We track the referrer in localStorage on the visitor\'s browser. Payouts are not yet live — but every referred action is logged on-chain via the fee transfer that we can attribute later.',
  },
  {
    n: '08',
    title: 'Self-host',
    body: 'The full source is configured for Vercel. Clone the repo, set NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_FEE_WALLET, and PINATA_JWT (server-only), then npm run dev or vercel deploy.',
  },
];

export default function DocsPage() {
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Docs
        </div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight">
          Straight answers, in <em className="italic text-sol-green">plain English</em>.
        </h1>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Card key={s.n}>
            <CardHeader>
              <span className="text-xs font-mono text-sol-green/80 tracking-widest">
                {s.n} /
              </span>
              <CardTitle className="mt-3">{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-sm text-muted-foreground">
        Questions we haven&apos;t answered? Check{' '}
        <Link href="/" className="text-sol-green hover:underline">
          rootrecord.info
        </Link>{' '}
        or open an issue on GitHub.
      </div>
    </div>
  );
}
