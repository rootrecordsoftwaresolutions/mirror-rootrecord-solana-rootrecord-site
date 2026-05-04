'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getPortalToken, getRootRecordApiBase } from '@/lib/rootrecordSession';

const ADMIN_EMAIL = 'rootrecord@outlook.com';

type InternalRow = { account_id: string; pubkey: string; created_at: string };
type LinkedRow = {
  account_id: string;
  pubkey: string;
  verified_at: string;
  message_preview: string;
};

export function WalletManagerClient() {
  const base = getRootRecordApiBase();
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [internal, setInternal] = useState<InternalRow[]>([]);
  const [linked, setLinked] = useState<LinkedRow[]>([]);

  const hydrateToken = useCallback(() => {
    const t = getPortalToken();
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    hydrateToken();
  }, [hydrateToken]);

  const load = useCallback(() => {
    setMsg('');
    const t = token.trim();
    if (!t) {
      setMsg(
        'Paste your session token or use “Read token from browser storage” after signing in on the portal.',
      );
      return;
    }
    if (!base) {
      setMsg('NEXT_PUBLIC_ROOTRECORD_API_BASE is not set in this deployment.');
      return;
    }
    setLoading(true);
    void fetch(`${base}/api/internal/wallet-manager/data`, {
      headers: { Authorization: `Bearer ${t}`, Accept: 'application/json' },
    })
      .then(async (r) => {
        const j = (await r.json()) as {
          ok?: boolean;
          detail?: string;
          internal?: InternalRow[];
          linked?: LinkedRow[];
        };
        if (!r.ok) {
          setMsg(j.detail || `HTTP ${r.status}`);
          return;
        }
        if (!j.ok) {
          setMsg('Unexpected response.');
          return;
        }
        setInternal(j.internal ?? []);
        setLinked(j.linked ?? []);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [base, token]);

  return (
    <div className="container max-w-4xl py-14 md:py-20">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Internal</p>
      <h1 className="font-display text-3xl md:text-4xl tracking-tight">Wallet manager</h1>
      <p className="mt-4 text-sm text-muted-foreground max-w-2xl">
        Authorized for <span className="text-foreground font-medium">{ADMIN_EMAIL}</span> only. Use the same JWT as{' '}
        <code className="text-xs font-mono">rootrecord_portal_token</code> after signing in on rootrecord.info. Custodial
        private keys are never sent to the browser.
      </p>

      {!base ? (
        <p className="mt-6 text-rose-400 text-sm" role="alert">
          API base is not configured (set <code className="font-mono text-xs">NEXT_PUBLIC_ROOTRECORD_API_BASE</code>).
        </p>
      ) : null}

      <div className="mt-8 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider" htmlFor="wm-tok">
          Session token
        </label>
        <Textarea
          id="wm-tok"
          className="min-h-[5rem] font-mono text-xs"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJ…"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={load} disabled={loading || !base}>
            {loading ? 'Loading…' : 'Load wallets'}
          </Button>
          <Button type="button" variant="outline" onClick={hydrateToken} disabled={loading}>
            Read token from browser storage
          </Button>
        </div>
        {msg ? (
          <p className="text-sm text-rose-400 whitespace-pre-wrap" role="status">
            {msg}
          </p>
        ) : null}
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">
          Custodial / internal (<code className="text-sm font-mono">internal_solana_wallets</code>)
        </h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          pubkey, account_id, created_at. Encrypted key material stays in D1 only.
        </p>
        <WalletTable
          columns={[
            { key: 'account_id', label: 'account_id' },
            { key: 'pubkey', label: 'pubkey' },
            { key: 'created_at', label: 'created_at' },
          ]}
          rows={internal as unknown as Record<string, string>[]}
        />
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">
          Linked self-custody (<code className="text-sm font-mono">solana_linked_wallets</code>)
        </h2>
        <WalletTable
          columns={[
            { key: 'account_id', label: 'account_id' },
            { key: 'pubkey', label: 'pubkey' },
            { key: 'verified_at', label: 'verified_at' },
            { key: 'message_preview', label: 'message_preview' },
          ]}
          rows={linked as unknown as Record<string, string>[]}
        />
      </section>
    </div>
  );
}

function WalletTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground py-4">No rows.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((c) => (
              <th key={c.key} className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/80 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="p-2 align-top break-all font-mono">
                  {String(r[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
