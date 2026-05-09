/**
 * Wallet admin calls go to same-origin `/api/dev/wallet-admin/*` (Next.js route proxies to
 * rootrecord-primary with server-side `RR_PUSH_ADMIN_SECRET`). Do not call the API host directly
 * from the browser — production Worker requires `X-RR-Push-Admin-Key`.
 */
function walletAdminBase(): string {
  return '';
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export type DevWalletListItem = {
  account_id: string;
  pubkey: string;
  created_at: string;
  email: string | null;
};

export type DevWalletOverview = {
  account_id: string;
  pubkey: string;
  sol_balance_lamports: number | null;
  token_accounts: Array<{
    token_account: string;
    mint: string | null;
    owner: string | null;
    amount_raw: string | null;
    decimals: number | null;
    ui_amount: number | null;
    ui_amount_string: string | null;
  }>;
};

function detailFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === 'string' && d.trim()) return d;
  }
  return fallback;
}

async function apiFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${walletAdminBase()}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...authHeaders(token),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

export async function devListWallets(
  token: string,
  limit = 200,
): Promise<{ ok: true; items: DevWalletListItem[] } | { ok: false; status: number; detail: string }> {
  const res = await apiFetch(`/api/dev/wallet-admin/wallets?limit=${encodeURIComponent(String(limit))}`, token);
  const j: unknown = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, detail: detailFromBody(j, `HTTP ${res.status}`) };
  const items =
    j && typeof j === 'object' && 'items' in j && Array.isArray((j as { items: unknown }).items)
      ? ((j as { items: DevWalletListItem[] }).items as DevWalletListItem[])
      : [];
  return { ok: true, items };
}

export async function devWalletOverview(
  token: string,
  accountId: string,
): Promise<{ ok: true; overview: DevWalletOverview } | { ok: false; status: number; detail: string }> {
  const res = await apiFetch(`/api/dev/wallet-admin/wallet/${encodeURIComponent(accountId)}/overview`, token);
  const j: unknown = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, detail: detailFromBody(j, `HTTP ${res.status}`) };
  return { ok: true, overview: j as DevWalletOverview };
}

export async function devTransferSol(
  token: string,
  accountId: string,
  toPubkeyBase58: string,
  lamports: number,
): Promise<{ ok: true; signature: string } | { ok: false; status: number; detail: string }> {
  const res = await apiFetch(`/api/dev/wallet-admin/wallet/${encodeURIComponent(accountId)}/transfer-sol`, token, {
    method: 'POST',
    body: JSON.stringify({ to_pubkey_base58: toPubkeyBase58, lamports }),
  });
  const j: unknown = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, detail: detailFromBody(j, `HTTP ${res.status}`) };
  const sig =
    j && typeof j === 'object' && 'signature' in j && typeof (j as { signature?: unknown }).signature === 'string'
      ? (j as { signature: string }).signature
      : '';
  return { ok: true, signature: sig };
}

export async function devTransferSpl(
  token: string,
  accountId: string,
  mintBase58: string,
  toOwnerBase58: string,
  amountUi: string,
  decimals: number,
): Promise<{ ok: true; signature: string } | { ok: false; status: number; detail: string }> {
  const res = await apiFetch(`/api/dev/wallet-admin/wallet/${encodeURIComponent(accountId)}/transfer-spl`, token, {
    method: 'POST',
    body: JSON.stringify({ mint_base58: mintBase58, to_owner_base58: toOwnerBase58, amount_ui: amountUi, decimals }),
  });
  const j: unknown = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, detail: detailFromBody(j, `HTTP ${res.status}`) };
  const sig =
    j && typeof j === 'object' && 'signature' in j && typeof (j as { signature?: unknown }).signature === 'string'
      ? (j as { signature: string }).signature
      : '';
  return { ok: true, signature: sig };
}

export async function devBurnSpl(
  token: string,
  accountId: string,
  mintBase58: string,
  amountUi: string,
  decimals: number,
): Promise<{ ok: true; signature: string } | { ok: false; status: number; detail: string }> {
  const res = await apiFetch(`/api/dev/wallet-admin/wallet/${encodeURIComponent(accountId)}/burn-spl`, token, {
    method: 'POST',
    body: JSON.stringify({ mint_base58: mintBase58, amount_ui: amountUi, decimals }),
  });
  const j: unknown = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, detail: detailFromBody(j, `HTTP ${res.status}`) };
  const sig =
    j && typeof j === 'object' && 'signature' in j && typeof (j as { signature?: unknown }).signature === 'string'
      ? (j as { signature: string }).signature
      : '';
  return { ok: true, signature: sig };
}

export async function devCloseEmptyAta(
  token: string,
  accountId: string,
  tokenAccountBase58: string,
  destinationBase58: string,
): Promise<{ ok: true; signature: string } | { ok: false; status: number; detail: string }> {
  const res = await apiFetch(`/api/dev/wallet-admin/wallet/${encodeURIComponent(accountId)}/close-empty-ata`, token, {
    method: 'POST',
    body: JSON.stringify({ token_account_base58: tokenAccountBase58, destination_base58: destinationBase58 }),
  });
  const j: unknown = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, detail: detailFromBody(j, `HTTP ${res.status}`) };
  const sig =
    j && typeof j === 'object' && 'signature' in j && typeof (j as { signature?: unknown }).signature === 'string'
      ? (j as { signature: string }).signature
      : '';
  return { ok: true, signature: sig };
}

