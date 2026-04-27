import { Metadata as MetaplexMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { cache } from 'react';

import { getConnection, metadataPda } from '@/lib/solana';

export type TokenHolderRow = {
  tokenAccount: string;
  /** Raw amount string from RPC */
  amountRaw: string;
  uiAmount: string;
  percentOfSupply: string;
};

export type TokenDashboardData = {
  mint: string;
  tokenProgram: 'spl-token' | 'token-2022';
  decimals: number;
  supplyRaw: string;
  supplyUi: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  name: string | null;
  symbol: string | null;
  metadataUri: string | null;
  /** Metaplex metadata update authority, if metadata exists */
  updateAuthority: string | null;
  priceUsd: number | null;
  topHolders: TokenHolderRow[];
};

function formatUiAmount(raw: bigint, decimals: number): string {
  if (decimals === 0) return raw.toString();
  const neg = raw < 0n;
  const v = neg ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = v % base;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  const s = fracStr.length ? `${whole}.${fracStr}` : whole.toString();
  return neg ? `-${s}` : s;
}

function percentOfSupply(holderRaw: bigint, supply: bigint): string {
  if (supply === 0n) return '0';
  const bps = (holderRaw * 10000n) / supply;
  return (Number(bps) / 100).toFixed(2);
}

async function fetchJupiterPriceUsd(mint: string): Promise<number | null> {
  const urls = [
    `https://lite-api.jup.ag/price/v2?ids=${encodeURIComponent(mint)}`,
    `https://api.jup.ag/price/v2?ids=${encodeURIComponent(mint)}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 45 } });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        data?: Record<string, { price?: string | number }>;
      };
      const p = json.data?.[mint]?.price;
      const n = typeof p === 'number' ? p : parseFloat(String(p ?? ''));
      if (Number.isFinite(n)) return n;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function readMetaplexMetadata(mint: PublicKey): Promise<{
  name: string | null;
  symbol: string | null;
  uri: string | null;
  updateAuthority: string | null;
}> {
  try {
    const connection = getConnection();
    const meta = await MetaplexMetadata.fromAccountAddress(
      connection,
      metadataPda(mint),
      'confirmed',
    );
    const { name, symbol, uri } = meta.data;
    return {
      name: name.replace(/\0/g, '').trim() || null,
      symbol: symbol.replace(/\0/g, '').trim() || null,
      uri: uri.replace(/\0/g, '').trim() || null,
      updateAuthority: meta.updateAuthority.toBase58(),
    };
  } catch {
    return { name: null, symbol: null, uri: null, updateAuthority: null };
  }
}

async function loadTokenDashboardUncached(
  mintStr: string,
): Promise<{ ok: true; data: TokenDashboardData } | { ok: false; error: string }> {
  let mint: PublicKey;
  try {
    mint = new PublicKey(mintStr.trim());
  } catch {
    return { ok: false, error: 'Invalid mint address' };
  }

  const connection = getConnection();
  const info = await connection.getAccountInfo(mint, 'confirmed');
  if (!info) {
    return { ok: false, error: 'Mint account not found on this cluster' };
  }

  const programId = info.owner;
  const isLegacy = programId.equals(TOKEN_PROGRAM_ID);
  const is2022 = programId.equals(TOKEN_2022_PROGRAM_ID);
  if (!isLegacy && !is2022) {
    return { ok: false, error: 'Not an SPL Token or Token-2022 mint' };
  }

  let mintData: Awaited<ReturnType<typeof getMint>>;
  try {
    mintData = await getMint(
      connection,
      mint,
      'confirmed',
      is2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
    );
  } catch {
    return { ok: false, error: 'Could not read mint account' };
  }

  const supply = mintData.supply;
  const decimals = mintData.decimals;
  const meta = await readMetaplexMetadata(mint);

  const [priceUsd, largestRes] = await Promise.all([
    fetchJupiterPriceUsd(mint.toBase58()),
    connection.getTokenLargestAccounts(mint, 'confirmed'),
  ]);

  const top = largestRes.value.slice(0, 12);
  const topHolders: TokenHolderRow[] = top.map((row) => {
    const raw = BigInt(row.amount);
    return {
      tokenAccount: row.address.toBase58(),
      amountRaw: row.amount,
      uiAmount: row.uiAmountString ?? formatUiAmount(raw, row.decimals),
      percentOfSupply: percentOfSupply(raw, supply),
    };
  });

  return {
    ok: true,
    data: {
      mint: mint.toBase58(),
      tokenProgram: is2022 ? 'token-2022' : 'spl-token',
      decimals,
      supplyRaw: supply.toString(),
      supplyUi: formatUiAmount(supply, decimals),
      mintAuthority: mintData.mintAuthority ? mintData.mintAuthority.toBase58() : null,
      freezeAuthority: mintData.freezeAuthority
        ? mintData.freezeAuthority.toBase58()
        : null,
      name: meta.name,
      symbol: meta.symbol,
      metadataUri: meta.uri,
      updateAuthority: meta.updateAuthority,
      priceUsd,
      topHolders,
    },
  };
}

/** Dedupes RPC + Jupiter work when the same mint is loaded from `generateMetadata` and the page. */
export const loadTokenDashboard = cache(loadTokenDashboardUncached);
