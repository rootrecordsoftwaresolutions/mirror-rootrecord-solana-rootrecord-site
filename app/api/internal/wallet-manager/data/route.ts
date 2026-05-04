import { NextResponse } from 'next/server';

/**
 * Server-side proxy to rootrecord-primary so the browser always hits same-origin
 * `/api/internal/wallet-manager/data` (avoids missing/wrong NEXT_PUBLIC_ROOTRECORD_API_BASE on Vercel).
 */
export const dynamic = 'force-dynamic';

function primaryApiOrigin(): string {
  const log = process.env.SOLANA_SITE_LOG_URL?.trim();
  if (log) {
    try {
      return new URL(log).origin;
    } catch {
      /* fall through */
    }
  }
  const explicit = process.env.ROOTRECORD_PRIMARY_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  return 'https://api.rootrecord.info';
}

export async function GET(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json(
      { ok: false, detail: 'Sign in required. Use Authorization: Bearer (session JWT).' },
      { status: 401 },
    );
  }

  const url = `${primaryApiOrigin()}/api/internal/wallet-manager/data`;
  const upstream = await fetch(url, {
    method: 'GET',
    headers: { Authorization: auth, Accept: 'application/json' },
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
