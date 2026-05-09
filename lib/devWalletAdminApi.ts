import { getRootRecordApiBase } from '@/lib/rootrecordSession';

function base(): string {
  const b = getRootRecordApiBase();
  return b.replace(/\/+$/, '');
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

async function apiFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  const b = base();
  if (!b) throw new Error('Account API is not configured for this build.');
  return fetch(`${b}${path}`, {
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
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) return { ok: false, status: res.status, detail: typeof j?.detail === 'string' ? j.detail : `HTTP ${res.status}` };
  return { ok: true, items: Array.isArray(j?.items) ? (j.items as DevWalletListItem[]) : [] };
}

export async function devWalletOverview(
  token: string,
  accountId: string,
): Promise<{ ok: true; overview: DevWalletOverview } | { ok: false; status: number; detail: string }> {
  const res = await apiFetch(`/api/dev/wallet-admin/wallet/${encodeURIComponent(accountId)}/overview`, token);
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) return { ok: false, status: res.status, detail: typeof j?.detail === 'string' ? j.detail : `HTTP ${res.status}` };
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
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) return { ok: false, status: res.status, detail: typeof j?.detail === 'string' ? j.detail : `HTTP ${res.status}` };
  return { ok: true, signature: typeof j?.signature === 'string' ? j.signature : '' };
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
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) return { ok: false, status: res.status, detail: typeof j?.detail === 'string' ? j.detail : `HTTP ${res.status}` };
  return { ok: true, signature: typeof j?.signature === 'string' ? j.signature : '' };
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
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) return { ok: false, status: res.status, detail: typeof j?.detail === 'string' ? j.detail : `HTTP ${res.status}` };
  return { ok: true, signature: typeof j?.signature === 'string' ? j.signature : '' };
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
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) return { ok: false, status: res.status, detail: typeof j?.detail === 'string' ? j.detail : `HTTP ${res.status}` };
  return { ok: true, signature: typeof j?.signature === 'string' ? j.signature : '' };
}

