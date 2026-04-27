import type { D1Database } from "@cloudflare/workers-types";

import { json } from "./cors";

export interface SolanaSiteEcosystemEnv {
  DB: D1Database;
  SOLANA_SITE_LOG_SECRET?: string;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i]! ^ bb[i]!;
  return diff === 0;
}

function assertBearer(request: Request, env: SolanaSiteEcosystemEnv): Response | null {
  const secret = (env.SOLANA_SITE_LOG_SECRET || "").trim();
  if (!secret) {
    return json({ ok: false, detail: "SOLANA_SITE_LOG_SECRET is not set on this Worker." }, 503);
  }
  const auth = request.headers.get("Authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token || !timingSafeEqualStr(token, secret)) {
    return json({ ok: false, detail: "Unauthorized" }, 401);
  }
  return null;
}

function isSlug(s: string, max: number): boolean {
  if (s.length < 1 || s.length > max) return false;
  return /^[a-z0-9][a-z0-9_.:-]*$/i.test(s);
}

/** POST /api/solana-site/ecosystem-bot-event — bots append telemetry (same Bearer as site log). */
export async function handleEcosystemBotEvent(
  request: Request,
  env: SolanaSiteEcosystemEnv,
): Promise<Response> {
  const deny = assertBearer(request, env);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, detail: "Invalid JSON" }, 400);
  }

  const botId = String(body.bot_id || "").trim().slice(0, 64);
  const eventType = String(body.event_type || "").trim().slice(0, 96);
  if (!isSlug(botId, 64) || !isSlug(eventType, 96)) {
    return json({ ok: false, detail: "Invalid bot_id or event_type" }, 400);
  }

  const poolId = body.pool_id != null ? String(body.pool_id).trim().slice(0, 64) : null;
  const mint = body.mint != null ? String(body.mint).trim().slice(0, 64) : null;
  const txSignature = body.tx_signature != null ? String(body.tx_signature).trim().slice(0, 128) : null;
  const amountTokenRaw = body.amount_token_raw != null ? String(body.amount_token_raw).trim().slice(0, 64) : null;
  const amountQuoteRaw = body.amount_quote_raw != null ? String(body.amount_quote_raw).trim().slice(0, 64) : null;
  const quoteCurrency = body.quote_currency != null ? String(body.quote_currency).trim().slice(0, 16) : null;
  const usdEstimate = body.usd_estimate != null ? String(body.usd_estimate).trim().slice(0, 32) : null;

  let metadataJson: string | null = null;
  if (body.metadata !== undefined && body.metadata !== null) {
    try {
      const s = JSON.stringify(body.metadata);
      if (s.length > 16_384) return json({ ok: false, detail: "metadata too large" }, 400);
      metadataJson = s;
    } catch {
      return json({ ok: false, detail: "metadata must be JSON-serializable" }, 400);
    }
  }

  try {
    await env.DB.prepare(
      `INSERT INTO ecosystem_bot_events
       (bot_id, event_type, pool_id, mint, tx_signature, amount_token_raw, amount_quote_raw, quote_currency, usd_estimate, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        botId,
        eventType,
        poolId,
        mint,
        txSignature,
        amountTokenRaw,
        amountQuoteRaw,
        quoteCurrency,
        usdEstimate,
        metadataJson,
      )
      .run();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "insert failed";
    return json({ ok: false, detail: msg }, 500);
  }

  return json({ ok: true }, 201);
}

/** GET /api/solana-site/ecosystem-bot-events — public feed (newest first). */
export async function handleEcosystemBotEvents(request: Request, env: SolanaSiteEcosystemEnv): Promise<Response> {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || "80");
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 80));

  try {
    const rows = await env.DB.prepare(
      `SELECT id, created_at, bot_id, event_type, pool_id, mint, tx_signature,
              amount_token_raw, amount_quote_raw, quote_currency, usd_estimate, metadata
       FROM ecosystem_bot_events
       ORDER BY id DESC
       LIMIT ?`,
    )
      .bind(limit)
      .all<Record<string, unknown>>();
    return json({ ok: true, events: rows.results ?? [] }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "query failed";
    return json({ ok: false, detail: msg }, 500);
  }
}

/** POST /api/solana-site/ecosystem-reinvest — queue a reinvest intent (same Bearer). */
export async function handleEcosystemReinvest(request: Request, env: SolanaSiteEcosystemEnv): Promise<Response> {
  const deny = assertBearer(request, env);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, detail: "Invalid JSON" }, 400);
  }

  const source = String(body.source || "").trim().slice(0, 64);
  const amountUsd = String(body.amount_usd || "").trim().slice(0, 32);
  if (!isSlug(source, 64) || !amountUsd) {
    return json({ ok: false, detail: "Invalid source or amount_usd" }, 400);
  }

  let metadataJson: string | null = null;
  if (body.metadata !== undefined && body.metadata !== null) {
    try {
      metadataJson = JSON.stringify(body.metadata);
      if (metadataJson.length > 8192) return json({ ok: false, detail: "metadata too large" }, 400);
    } catch {
      return json({ ok: false, detail: "metadata must be JSON-serializable" }, 400);
    }
  }

  try {
    await env.DB.prepare(
      `INSERT INTO ecosystem_reinvest_queue (source, amount_usd, status, metadata)
       VALUES (?, ?, 'pending', ?)`,
    )
      .bind(source, amountUsd, metadataJson)
      .run();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "insert failed";
    return json({ ok: false, detail: msg }, 500);
  }

  return json({ ok: true }, 201);
}

/** GET /api/solana-site/ecosystem-reinvest-pending — public queue snapshot. */
export async function handleEcosystemReinvestPending(
  request: Request,
  env: SolanaSiteEcosystemEnv,
): Promise<Response> {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || "40");
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 40));

  try {
    const rows = await env.DB.prepare(
      `SELECT id, created_at, source, amount_usd, status, metadata
       FROM ecosystem_reinvest_queue
       WHERE status = 'pending'
       ORDER BY id DESC
       LIMIT ?`,
    )
      .bind(limit)
      .all<Record<string, unknown>>();
    return json({ ok: true, rows: rows.results ?? [] }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "query failed";
    return json({ ok: false, detail: msg }, 500);
  }
}
