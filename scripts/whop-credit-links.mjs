#!/usr/bin/env node
// Create the Whop checkout links behind the portal's "Buy credits" panel.
//
// Modeled on podlab-crm/scripts/whop-site-links.mjs: one shared link per credit
// pack (every client uses the same one), each a crm.payment_links row with no
// lead, so the CRM's Whop webhook knows which pack was bought. WHO bought is
// matched from the payment (their deal, else their portal login email) and the
// webhook writes the grant into public.portal_credit_ledger (podlab-crm branch
// feat/portal-credits, src/lib/portalCredits.ts).
//
//   node --experimental-strip-types scripts/whop-credit-links.mjs --dry   # show, create nothing
//   node --experimental-strip-types scripts/whop-credit-links.mjs         # create what's missing (LIVE)
//
// Prices come from lib/portal/credits.ts, the single source. Idempotent: a pack
// that already has a live portal-credits link is printed, not remade. Changing
// a price means voiding that pack's payment_links row (status 'void') and
// running this again; never delete the Whop plan (memory: Whop reuses plans).
//
// After a live run, set the printed env vars on the podlab-site Vercel project
// (Production) and redeploy; until then the Buy panel says "Not set up yet".
//
// Credentials come from the login keychain, never printed: whop/podlab (API
// key), supabase-url, supabase-key (service role).

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const DRY = process.argv.includes("--dry");
const { CREDIT_PACKS } = await import(new URL("../lib/portal/credits.ts", import.meta.url).href);

const kc = (svc, acct) =>
  execFileSync("security", ["find-generic-password", "-s", svc, ...(acct ? ["-a", acct] : []), "-w"]).toString().trim();

const API_BASE = process.env.WHOP_API_BASE || "https://api.whop.com/api/v1";
const API_VERSION = "2026-09-23";
const ACCOUNT_ID = process.env.WHOP_ACCOUNT_ID || "biz_5DGEtWdd29phyp";
const PRODUCT_ID = process.env.WHOP_PRODUCT_ID || "prod_1g9rr0Ek7DfxM"; // hidden "PodLab Services"
const REDIRECT = "https://podlablv.com/portal/projects?credits=thanks";
const CREATED_BY = "portal-credits";

const SB_URL = kc("supabase-url").replace(/\/$/, "");
const SB_KEY = kc("supabase-key");

async function sb(path, init = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "content-type": "application/json",
      "Accept-Profile": "crm", "Content-Profile": "crm", Prefer: "return=representation", ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json();
}

// Same request shape as podlab-crm src/lib/whop.ts createCheckoutLink (field
// names from @whop/sdk), one retry budget for 429/5xx.
async function whop(path, body) {
  const key = process.env.WHOP_API_KEY || kc("whop", "podlab");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json", "Api-Version-Date": API_VERSION },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, Math.min(Number(res.headers.get("retry-after")) || attempt + 1, 5) * 1000));
      continue;
    }
    throw new Error(`Whop ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

async function createLink(pack, linkId) {
  const common = { currency: "usd", title: `PodLab ${pack.label}`.slice(0, 30), visibility: "hidden", product_id: PRODUCT_ID, force_create_new_plan: true };
  // A recurring plan's checkout total is initial_price PLUS the first renewal,
  // so monthly sets initial_price 0 or month one bills twice.
  const plan = pack.kind === "monthly"
    ? { ...common, plan_type: "renewal", initial_price: 0, renewal_price: pack.price, billing_period: 30 }
    : { ...common, plan_type: "one_time", initial_price: pack.price };
  const config = await whop("/checkout_configurations", {
    account_id: ACCOUNT_ID,
    plan,
    // Copied onto every payment (and the monthly membership's renewals): the
    // webhook reads lab_key to know this is a credit pack.
    metadata: { link_id: linkId, source: "portal-credits", lab_key: pack.key, credits: String(pack.credits) },
    redirect_url: REDIRECT,
  });
  if (!config.purchase_url) throw new Error("Whop returned no purchase_url");
  return { checkoutId: config.id, planId: config.plan?.id || null, purchaseUrl: config.purchase_url };
}

const env = [];
for (const pack of CREDIT_PACKS) {
  const [existing] = await sb(
    `payment_links?select=id,purchase_url&lab_key=eq.${pack.key}&lead_id=is.null&created_by=eq.${CREATED_BY}&status=neq.void&limit=1`);
  if (existing) {
    console.log(`exists   ${pack.label.padEnd(20)} ${existing.purchase_url}`);
    env.push(`${pack.env}=${existing.purchase_url}`);
    continue;
  }
  const price = pack.kind === "monthly" ? `$${pack.price}/mo` : `$${pack.price}`;
  if (DRY) { console.log(`would create ${pack.label.padEnd(20)} ${price}  (${pack.key})`); continue; }

  const id = randomUUID();
  const link = await createLink(pack, id);
  await sb("payment_links", {
    method: "POST",
    body: JSON.stringify({
      id, lead_id: null, lab_key: pack.key, label: `PodLab ${pack.label}`, kind: pack.kind,
      amount_cents: pack.price * 100, processor: "whop", status: "sent",
      checkout_id: link.checkoutId, plan_id: link.planId, purchase_url: link.purchaseUrl,
      created_by: CREATED_BY,
    }),
  });
  console.log(`created  ${pack.label.padEnd(20)} ${price}  ${link.purchaseUrl}`);
  env.push(`${pack.env}=${link.purchaseUrl}`);
}

if (env.length) {
  console.log("\nSet these on the podlab-site Vercel project (Production), then redeploy:");
  for (const line of env) console.log(`  ${line}`);
}
