import { USDC_MINT, WSOL_MINT } from '@/lib/ecosystemOtcConstants';

export type JupiterUsdMark = { solUsd: number; usdcUsd: number; fetchedAt: number };

/** Jupiter Price API v2 — same source as `/api/ecosystem/jup-prices`. */
export async function fetchJupiterSolUsdcUsd(): Promise<JupiterUsdMark> {
  const url = `https://lite-api.jup.ag/price/v2?ids=${WSOL_MINT},${USDC_MINT}`;
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`Jupiter price HTTP ${r.status}`);
  }
  const j = (await r.json()) as { data?: Record<string, { price?: string }> };
  const sol = Number(j.data?.[WSOL_MINT]?.price ?? '');
  const usdc = Number(j.data?.[USDC_MINT]?.price ?? '');
  if (!Number.isFinite(sol) || sol <= 0) {
    throw new Error('Invalid SOL USD mark');
  }
  return {
    solUsd: sol,
    usdcUsd: Number.isFinite(usdc) && usdc > 0 ? usdc : 1,
    fetchedAt: Date.now(),
  };
}
