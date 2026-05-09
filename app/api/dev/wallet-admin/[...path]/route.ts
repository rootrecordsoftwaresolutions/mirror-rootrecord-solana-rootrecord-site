import { NextRequest, NextResponse } from 'next/server';

/** Same host as `NEXT_PUBLIC_ROOTRECORD_API_BASE`; defaults to production API. */
function rootrecordApiBase(): string {
  const b =
    process.env.ROOTRECORD_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_ROOTRECORD_API_BASE?.trim() ||
    'https://api.rootrecord.info';
  return b.replace(/\/+$/, '');
}

/**
 * Server-side proxy: attaches `X-RR-Push-Admin-Key` so rootrecord-primary wallet-admin
 * accepts the request in production (must match Worker secret `RR_PUSH_ADMIN_SECRET`).
 * Never expose that secret to the browser — only this route reads it.
 */
async function proxy(request: NextRequest, pathSegments: string[], method: 'GET' | 'POST'): Promise<NextResponse> {
  const secret = process.env.RR_PUSH_ADMIN_SECRET?.trim() || '';
  if (!secret) {
    return NextResponse.json(
      { detail: 'Wallet admin proxy is not configured. Set RR_PUSH_ADMIN_SECRET on Vercel (same value as the Worker secret).' },
      { status: 503 },
    );
  }

  const subPath = pathSegments.filter(Boolean).join('/');
  const search = request.nextUrl.search || '';
  const upstreamUrl = `${rootrecordApiBase()}/api/dev/wallet-admin/${subPath}${search}`;

  const authorization = request.headers.get('Authorization') || '';
  const headers: HeadersInit = {
    'X-RR-Push-Admin-Key': secret,
    ...(authorization ? { Authorization: authorization } : {}),
  };

  let body: string | undefined;
  if (method === 'POST') {
    body = await request.text();
    const ct = request.headers.get('Content-Type');
    if (ct) (headers as Record<string, string>)['Content-Type'] = ct;
    else (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const res = await fetch(upstreamUrl, { method, headers, body });
  const text = await res.text();
  const ct = res.headers.get('Content-Type') || 'application/json; charset=utf-8';
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': ct } });
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  const path = context.params.path ?? [];
  return proxy(request, path, 'GET');
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  const path = context.params.path ?? [];
  return proxy(request, path, 'POST');
}
