/** Official listing SPL mint (override with NEXT_PUBLIC_ECOSYSTEM_TOKEN_MINT). */
export const ECOSYSTEM_OTC_TOKEN_MINT =
  process.env.NEXT_PUBLIC_ECOSYSTEM_TOKEN_MINT?.trim() ||
  '8hwxLN1Q4Yr8xFErErULCqNvcF1cMwGjpRXPz6DAH7gM';

/** Metaplex listing symbol — keep in sync with on-chain metadata. */
export const ECOSYSTEM_LISTING_SYMBOL = 'ROOTS';

/** Metaplex listing name — keep in sync with on-chain metadata. */
export const ECOSYSTEM_LISTING_NAME = 'Root Record Software Solutions';

const DEFAULT_TREASURY_OPERATOR = '3QG6gVk3fdimzQaKX9zf7J6kCs5DRLKg1RNea3VBosDJ';

/** Treasury / operator wallet (Solscan). */
export const ECOSYSTEM_SOLSCAN_TREASURY =
  process.env.NEXT_PUBLIC_ECOSYSTEM_SOLSCAN_TREASURY?.trim() || DEFAULT_TREASURY_OPERATOR;

/**
 * Optional second explorer pubkey for “developer / ops” copy.
 * Defaults to the treasury when treasury and operator share one wallet.
 */
export const ECOSYSTEM_SOLSCAN_DEVELOPER =
  process.env.NEXT_PUBLIC_ECOSYSTEM_SOLSCAN_DEVELOPER?.trim() || DEFAULT_TREASURY_OPERATOR;

const DEFAULT_POOL_RELATED_ACCOUNTS = [
  'B5AZM1c9oPDUUY4bgyaEYNaGHbnPDXGp1qDqQeU1w9KW',
  'GjFZgWjTBi8CW2KHPgMRXpLMkyUF3squZsnRZi4jLVNV',
  'GjUnPAYqf3NQL5dDBDH2TdmgkSe53AdaXwDggxFKFryz',
] as const;

function parsePoolRelatedAccounts(): readonly string[] {
  const raw = process.env.NEXT_PUBLIC_ECOSYSTEM_POOL_RELATED_ACCOUNTS?.trim();
  if (!raw) return DEFAULT_POOL_RELATED_ACCOUNTS;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : DEFAULT_POOL_RELATED_ACCOUNTS;
}

/**
 * Raydium / pool-program accounts tied to official liquidity.
 * Default list matches custodial tooling exclusions (see `freeze-new-token-accounts.mjs` in Worker repo).
 */
export const ECOSYSTEM_POOL_RELATED_ACCOUNTS: readonly string[] =
  parsePoolRelatedAccounts();

export const solscanAccount = (pubkey: string) =>
  `https://solscan.io/account/${pubkey.trim()}`;

export const solscanToken = (mint: string) => `https://solscan.io/token/${mint.trim()}`;

/**
 * USD per whole listing token when Jupiter has no USD mark (feeds down / not listed).
 * Tokenomics fallback only; live marks come from Jupiter when available.
 */
export const OTC_USD_PER_TOKEN = 0.00001;

/** Wrapped SOL mint (Jupiter price id). */
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

/** OTC pre-sale peg: USD per whole listing token (public tokenomics). */
export const OTC_PRESALE_USD_PEG = 1;

/**
 * Of the **matched** liquidity mint (equal to the buyer tranche at the peg), basis points
 * reserved to accumulate SOL for SPL transfer fees before splitting the rest across pools.
 */
export const OTC_PRESALE_MATCHED_FEE_RESERVE_BPS = 200;

/**
 * Remainder of the matched tranche after {@link OTC_PRESALE_MATCHED_FEE_RESERVE_BPS}, split
 * between USDC-quoted and SOL-quoted pool seeding (each ~49% of the original matched tranche).
 */
export const OTC_PRESALE_POOL_USDC_BPS = 4900;
export const OTC_PRESALE_POOL_SOL_BPS = 4900;

const parsedFreezeDays = Number(process.env.NEXT_PUBLIC_OTC_PRESALE_FREEZE_DAYS?.trim());

/**
 * OTC buyer allocation: SPL token account stays **frozen** this many full calendar days after mint
 * (operator must thaw after; see tokenomics). Override with `NEXT_PUBLIC_OTC_PRESALE_FREEZE_DAYS`.
 */
export const OTC_PRESALE_FREEZE_DAYS =
  Number.isFinite(parsedFreezeDays) && parsedFreezeDays > 0 ? Math.floor(parsedFreezeDays) : 30;
