# RootRecord Solana Tools — PRD

## Original problem statement
Build a complete, production-ready Next.js 14+ App Router web app called **RootRecord
Solana Tools** that will live at `solana.rootrecord.info`. A fast, cheap, user-first
Solana SPL token creator and management suite that undercuts every competitor by ~50%
while delivering a cleaner, more trustworthy experience. Must replicate the
rootrecord.info aesthetic 1:1, dark mode by default, with Solana brand accents
(#14F195 green, #9945FF purple). All Solana interactions client-side.

## Architecture
- **Stack:** Next.js 14 App Router · TypeScript · Tailwind · shadcn-style UI · sonner
- **Solana:** `@solana/web3.js`, `@solana/spl-token`, `@metaplex-foundation/mpl-token-metadata`
  v2.13 (legacy createCreate/Update instruction creators), `@solana/wallet-adapter-*`
- **Wallets:** Phantom, Solflare adapters + Wallet Standard auto-detect (Backpack, Glow…)
- **IPFS:** Pinata (frontend SDK calls — JWT in env)
- **Forms:** React Hook Form + Zod
- **No backend:** fully client-side; deploy via Vercel.

## Personas
1. Memecoin launcher — wants a fast, cheap, trustworthy mint flow and instant
   "revoke authority" buttons.
2. Indie founder — wants to mint a real utility token, update metadata later,
   pay per action, no subscriptions.
3. Crypto-curious user — drawn in by the calm, transparent UI; values seeing
   real on-chain costs vs platform fees.

## Static core requirements
- Charge ~half what competitors charge, transparently. Default fees:
  `CREATE_FEE_SOL = 0.025`, `ACTION_FEE_SOL = 0.01`.
- Every fee-bearing action includes a `SystemProgram.transfer` inside the same
  signed transaction (no "trust us, we'll bill you" patterns).
- 1:1 aesthetic match with rootrecord.info: numbered sections, italic emphasis on
  key words, ample whitespace, soft accents.
- Wallet-first: wallet adapter button always visible; create form gates submit
  on connection.
- IPFS metadata via Pinata (logo + JSON).
- Referral capture: `?ref=WALLET` saved to localStorage on every page load and
  shown as a header pill.

## What's been implemented (Jan 26, 2026)
- ✅ Project scaffolding: Next.js 14 + TS + Tailwind + shadcn primitives
- ✅ Dark theme matching rootrecord.info, custom color palette (`ink`, `sol`)
- ✅ Inter (sans) + Instrument Serif (display italic) fonts
- ✅ Header with brand mark, navigation, ReferralPill, wallet adapter button
- ✅ Footer with Privacy, Terms, GitHub, brand statement
- ✅ Landing page (`/`) — hero with italic emphasis, trust bar, 4 numbered
  feature cards, principles section, competitor comparison table, fake
  "recently launched" wall, dual-CTA closer
- ✅ Token Creator page (`/create`) — full form (name, symbol, decimals, supply
  with comma formatting, description, logo dropzone, website/twitter/telegram),
  fee sidebar, "what happens" sidebar, fee-wallet warning banner
- ✅ Single-tx token creation flow:
  createAccount → InitializeMint2 → createATA → MintTo(full supply) →
  CreateMetadataAccountV3 → fee transfer
- ✅ Success dialog: copy mint, Solscan/Solana.fm links, one-click revoke mint
  authority, revoke freeze authority, mint more, share-on-X
- ✅ Tools page (`/tools`) — 4 cards opening modal forms for revoke mint /
  revoke freeze / mint more / update metadata
- ✅ Pricing page (`/pricing`) — fee comparison vs competitors, real on-chain costs
- ✅ Docs page (`/docs`) — 6 numbered sections explaining each flow
- ✅ Privacy + Terms pages
- ✅ Referral system stub: parse `?ref=`, store in localStorage, header pill
- ✅ Pinata uploader (file + JSON) with `isPinataConfigured` guard
- ✅ `.env.example`, README.md, vercel.json
- ✅ Production build passes (`next build` → 10 routes static)
- ✅ TypeScript strict, ESLint clean

## NOT IMPLEMENTED / placeholders
- `NEXT_PUBLIC_FEE_WALLET` is a placeholder — the app shows a yellow "set this
  to enable monetization" banner until the user fills it.
- `NEXT_PUBLIC_PINATA_JWT` is a placeholder — IPFS uploads are skipped (token
  still creates without an image) until the user provides a JWT. **MOCKED-FREE**:
  no fake APIs; the code talks to Pinata and Solana RPC directly when configured.
- Referral payouts (the 30% split) — only the capture/display is live; the
  actual payout from the platform fee wallet is a backend job for later.

## Prioritized backlog
- **P0:** Server-side Pinata proxy (so JWT isn't exposed in the bundle).
- **P0:** Real e2e test on devnet with a funded wallet.
- **P1:** Real "recently launched" feed (read mint creations from RPC).
- **P1:** Token-2022 extension support (transfer fees, hooks).
- **P1:** Liquidity helpers (Raydium / Meteora pool creation).
- **P2:** Backend referral payout cron (read fee-wallet incomings, attribute to
  referrer, distribute 30% weekly).
- **P2:** Authority status badges (read mint to show "mint revoked", "freeze
  revoked", "metadata immutable" state on the tools page).

## Run / deploy
- Local: `cp .env.example .env.local`, fill values, `npm install --legacy-peer-deps`,
  `npm run dev` → http://localhost:3000
- Vercel: connect repo, set env vars, deploy. `vercel.json` already configured.
