import { NextResponse } from 'next/server';

import { loadTreasuryKeypair } from '@/lib/ecosystemOtcFulfill';

export const dynamic = 'force-dynamic';

/** Public: treasury address for OTC deposits (no secret exposed). */
export async function GET() {
  try {
    const kp = loadTreasuryKeypair();
    return NextResponse.json({ ok: true, treasury: kp.publicKey.toBase58() });
  } catch {
    return NextResponse.json({ ok: false, configured: false }, { status: 200 });
  }
}
