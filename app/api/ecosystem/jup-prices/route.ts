import { NextResponse } from 'next/server';

const WSOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * Cached SOL / USDC USD reference for OTC calculator (Jupiter Price API v2).
 */
export async function GET() {
  try {
    const url = `https://lite-api.jup.ag/price/v2?ids=${WSOL},${USDC}`;
    const r = await fetch(url, { next: { revalidate: 15 } });
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, detail: `price upstream ${r.status}` },
        { status: 502 },
      );
    }
    const j = (await r.json()) as {
      data?: Record<string, { price?: string }>;
    };
    const sol = Number(j.data?.[WSOL]?.price ?? '');
    const usdc = Number(j.data?.[USDC]?.price ?? '');
    if (!Number.isFinite(sol) || sol <= 0) {
      return NextResponse.json({ ok: false, detail: 'bad SOL price' }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      sol_usd: sol,
      usdc_usd: Number.isFinite(usdc) && usdc > 0 ? usdc : 1,
      fetched_at: Date.now(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, detail: e instanceof Error ? e.message : 'price error' },
      { status: 500 },
    );
  }
}
