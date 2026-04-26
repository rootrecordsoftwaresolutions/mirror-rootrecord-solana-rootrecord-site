# RootRecord Solana Tools

Fast, cheap, on-chain SPL token creator and management suite for Solana —
designed as a calm, no-BS extension of [rootrecord.info](https://rootrecord.info).

Lives at: **solana.rootrecord.info**

## Features

- **Create Token** (`/create`) — Single-tx SPL mint creation with Metaplex v3
  metadata pinned to IPFS via Pinata. Pays a 0.025 SOL platform fee.
- **Revoke Mint / Freeze Authority** (`/tools`) — One-click, on-chain.
- **Mint More** — Top up supply (mint authority must be active).
- **Update Metadata** — Change name / symbol / URI on a mutable mint.
- **Pricing transparency** — Side-by-side with competitor fees.
- **Referral stub** — `?ref=WALLET` is captured into localStorage on every page
  load and shown as a small pill in the header. Backend payouts come later.

## Tech

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn-style primitives
- `@solana/web3.js`, `@solana/spl-token`, `@metaplex-foundation/mpl-token-metadata` v3
- `@solana/wallet-adapter-*` for Phantom, Solflare, and Wallet-Standard wallets
- `react-hook-form` + `zod` for forms
- `sonner` for toasts
- `react-dropzone` for the logo uploader

## Setup

```bash
npm install     # or yarn / pnpm
cp .env.example .env.local
# fill in NEXT_PUBLIC_FEE_WALLET, NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_PINATA_JWT
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet-beta` (default) / `devnet` / `testnet` |
| `NEXT_PUBLIC_RPC_URL` | RPC endpoint — recommend Helius or QuickNode |
| `NEXT_PUBLIC_FEE_WALLET` | Public key receiving the platform fee |
| `NEXT_PUBLIC_CREATE_FEE_SOL` | Default `0.025` |
| `NEXT_PUBLIC_ACTION_FEE_SOL` | Default `0.01` (revoke / mint / update) |
| `PINATA_JWT` | **Server-only**. JWT for Pinata IPFS uploads. Browser never sees it. |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Custom Pinata gateway domain (optional) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for OG / SEO |

> ✅ The Pinata JWT is **server-only**. The frontend uploads through three
> Next.js Route Handlers under `/api/pin/*` so the JWT never lands in the
> client bundle.

## Deploy to Vercel

This repo includes `vercel.json`. Connect the repo, set the env vars under
Project Settings, and you&apos;re live. The recommended subdomain is
`solana.rootrecord.info`.

## Architecture notes

- All Solana interactions are client-side. No private keys are ever read.
- Every fee-bearing action (`create`, `revoke-*`, `mint-more`, `update-metadata`)
  appends a `SystemProgram.transfer` to the platform fee wallet inside the
  same atomic transaction.
- Token creation builds a single transaction with: createAccount → InitializeMint2
  → CreateATA → MintTo(full supply) → CreateMetadataV3 → fee transfer.
- The mint Keypair is generated locally and partial-signs the tx; the user&apos;s
  wallet finalizes the signature.

## Roadmap

- Token-2022 extensions (transfer fees, hooks)
- Server-side Pinata proxy
- Referral payouts (30% of platform fee back to ?ref wallet)
- Recently-created token feed (real, on-chain)
- Liquidity helpers (Raydium / Meteora pool create)

## License

MIT — built with respect for users.
