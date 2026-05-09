'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

import {
  devBurnSpl,
  devCloseEmptyAta,
  devListWallets,
  devTransferSol,
  devTransferSpl,
  devWalletOverview,
  type DevWalletListItem,
  type DevWalletOverview,
} from '@/lib/devWalletAdminApi';
import { getPortalToken } from '@/lib/rootrecordSession';

function short(s: string, n = 42): string {
  if (!s) return '';
  return s.length <= n ? s : `${s.slice(0, Math.max(0, n - 1))}…`;
}

function solFromLamports(lamports: number | null): string {
  if (lamports == null || !Number.isFinite(lamports)) return '—';
  const sol = lamports / 1e9;
  const fixed = sol.toFixed(9);
  return fixed.replace(/0+$/, '').replace(/\.$/, '');
}

export function DevWalletAdminClient() {
  const [busy, setBusy] = useState(false);
  const [wallets, setWallets] = useState<DevWalletListItem[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [overview, setOverview] = useState<DevWalletOverview | null>(null);

  const [sendSolTo, setSendSolTo] = useState('');
  const [sendSolLamports, setSendSolLamports] = useState('');

  const [sendSplMint, setSendSplMint] = useState('');
  const [sendSplTo, setSendSplTo] = useState('');
  const [sendSplAmount, setSendSplAmount] = useState('');
  const [sendSplDecimals, setSendSplDecimals] = useState('9');

  const [burnSplMint, setBurnSplMint] = useState('');
  const [burnSplAmount, setBurnSplAmount] = useState('');
  const [burnSplDecimals, setBurnSplDecimals] = useState('9');

  const token = useMemo(() => getPortalToken() || '', []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return wallets;
    return wallets.filter((w) => `${w.account_id} ${w.pubkey} ${w.email || ''}`.toLowerCase().includes(q));
  }, [wallets, filter]);

  async function refreshWallets() {
    if (!token) {
      toast.error('Sign in required', { description: 'Open /account and sign in first.' });
      return;
    }
    setBusy(true);
    try {
      const res = await devListWallets(token, 200);
      if (!res.ok) {
        toast.error('Wallet admin unavailable', { description: res.detail });
        return;
      }
      setWallets(res.items || []);
      toast.success('Loaded', { description: `${res.items.length} wallet(s)` });
    } catch (e) {
      toast.error('Request failed', { description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function loadOverview(accountId: string) {
    if (!token) return;
    setBusy(true);
    setOverview(null);
    try {
      const res = await devWalletOverview(token, accountId);
      if (!res.ok) {
        toast.error('Overview failed', { description: res.detail });
        return;
      }
      setOverview(res.overview);
    } catch (e) {
      toast.error('Request failed', { description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function onSendSol() {
    if (!token || !selected) return;
    const to = sendSolTo.trim();
    const lam = Number(sendSolLamports.trim());
    if (!to || !Number.isFinite(lam) || lam <= 0) {
      toast.error('Missing fields', { description: 'To pubkey + lamports required.' });
      return;
    }
    setBusy(true);
    try {
      const res = await devTransferSol(token, selected, to, lam);
      if (!res.ok) return toast.error('Send failed', { description: res.detail });
      toast.success('Sent SOL', { description: res.signature ? short(res.signature, 18) : 'OK' });
      await loadOverview(selected);
    } finally {
      setBusy(false);
    }
  }

  async function onSendSpl() {
    if (!token || !selected) return;
    const mint = sendSplMint.trim();
    const toOwner = sendSplTo.trim();
    const amt = sendSplAmount.trim();
    const dec = Number(sendSplDecimals.trim());
    if (!mint || !toOwner || !amt || !Number.isFinite(dec)) {
      toast.error('Missing fields', { description: 'Mint + to owner + amount + decimals required.' });
      return;
    }
    setBusy(true);
    try {
      const res = await devTransferSpl(token, selected, mint, toOwner, amt, dec);
      if (!res.ok) return toast.error('Send failed', { description: res.detail });
      toast.success('Sent SPL', { description: res.signature ? short(res.signature, 18) : 'OK' });
      await loadOverview(selected);
    } finally {
      setBusy(false);
    }
  }

  async function onBurnSpl() {
    if (!token || !selected) return;
    const mint = burnSplMint.trim();
    const amt = burnSplAmount.trim();
    const dec = Number(burnSplDecimals.trim());
    if (!mint || !amt || !Number.isFinite(dec)) {
      toast.error('Missing fields', { description: 'Mint + amount + decimals required.' });
      return;
    }
    if (!confirm('Burn is irreversible. Continue?')) return;
    setBusy(true);
    try {
      const res = await devBurnSpl(token, selected, mint, amt, dec);
      if (!res.ok) return toast.error('Burn failed', { description: res.detail });
      toast.success('Burned SPL', { description: res.signature ? short(res.signature, 18) : 'OK' });
      await loadOverview(selected);
    } finally {
      setBusy(false);
    }
  }

  async function onCloseAta(tokenAccount: string) {
    if (!token || !selected) return;
    const destDefault = overview?.pubkey || '';
    const dest = String(prompt('Destination pubkey for reclaimed rent (base58):', destDefault) || '').trim();
    if (!dest) return;
    if (!confirm('Close token account? This only succeeds if it is empty.')) return;
    setBusy(true);
    try {
      const res = await devCloseEmptyAta(token, selected, tokenAccount, dest);
      if (!res.ok) return toast.error('Close failed', { description: res.detail });
      toast.success('Closed ATA', { description: res.signature ? short(res.signature, 18) : 'OK' });
      await loadOverview(selected);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refreshWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Wallet admin (dev-only)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Requires a RootRecord portal session and server dev flag. Intended for rootrecord@outlook.com only.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Wallets</CardTitle>
            <Button variant="outline" size="sm" onClick={() => void refreshWallets()} disabled={busy}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="filter">Filter</Label>
              <Input id="filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="account_id, pubkey, email" />
            </div>

            <div className="grid gap-2">
              {filtered.length ? (
                filtered.map((w) => (
                  <Button
                    key={w.account_id}
                    variant={selected === w.account_id ? 'default' : 'outline'}
                    className="h-auto justify-start whitespace-normal rounded-2xl py-3"
                    onClick={() => {
                      setSelected(w.account_id);
                      void loadOverview(w.account_id);
                    }}
                  >
                    <div className="text-left w-full">
                      <div className="font-mono text-xs">{w.account_id}</div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono">
                        {short(w.pubkey, 48)}
                        {w.email ? ` — ${w.email}` : ''}
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No wallets.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground">Select a wallet.</div>
            ) : !overview ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Account</div>
                  <div className="font-mono text-xs">{overview.account_id}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Pubkey</div>
                  <div className="font-mono text-xs break-all">{overview.pubkey}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">SOL</div>
                  <div className="font-mono text-xs">{solFromLamports(overview.sol_balance_lamports)}</div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <div className="font-semibold">Send SOL</div>
                    <Input value={sendSolTo} onChange={(e) => setSendSolTo(e.target.value)} placeholder="To pubkey (base58)" />
                    <Input value={sendSolLamports} onChange={(e) => setSendSolLamports(e.target.value)} placeholder="Lamports (integer)" />
                    <Button onClick={() => void onSendSol()} disabled={busy}>
                      Send SOL
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <div className="font-semibold">Send SPL</div>
                    <Input value={sendSplMint} onChange={(e) => setSendSplMint(e.target.value)} placeholder="Mint (base58)" />
                    <Input value={sendSplTo} onChange={(e) => setSendSplTo(e.target.value)} placeholder="To owner pubkey (base58)" />
                    <Input value={sendSplAmount} onChange={(e) => setSendSplAmount(e.target.value)} placeholder="Amount UI (e.g. 1.5)" />
                    <Input value={sendSplDecimals} onChange={(e) => setSendSplDecimals(e.target.value)} placeholder="Decimals (e.g. 9)" />
                    <Button onClick={() => void onSendSpl()} disabled={busy}>
                      Send SPL
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <div className="font-semibold">Burn SPL</div>
                    <Input value={burnSplMint} onChange={(e) => setBurnSplMint(e.target.value)} placeholder="Mint (base58)" />
                    <Input value={burnSplAmount} onChange={(e) => setBurnSplAmount(e.target.value)} placeholder="Amount UI (e.g. 1)" />
                    <Input value={burnSplDecimals} onChange={(e) => setBurnSplDecimals(e.target.value)} placeholder="Decimals (e.g. 9)" />
                    <Button variant="outline" onClick={() => void onBurnSpl()} disabled={busy}>
                      Burn SPL
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="font-semibold mb-2">Token accounts</div>
                  <div className="grid gap-2">
                    {(overview.token_accounts || []).length ? (
                      overview.token_accounts.map((t) => (
                        <Card key={t.token_account} className="rounded-2xl">
                          <CardContent className="py-4 space-y-2">
                            <div className="text-xs text-muted-foreground">Mint</div>
                            <div className="font-mono text-xs break-all">{t.mint || '—'}</div>
                            <div className="text-xs text-muted-foreground">Token account</div>
                            <div className="font-mono text-xs break-all">{t.token_account}</div>
                            <div className="text-xs text-muted-foreground">Balance</div>
                            <div className="font-mono text-xs">{t.ui_amount_string || (t.ui_amount == null ? '—' : String(t.ui_amount))}</div>
                            <div className="pt-1">
                              <Button variant="outline" size="sm" onClick={() => void onCloseAta(t.token_account)} disabled={busy}>
                                Close empty ATA (rent)
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No SPL token accounts found.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

