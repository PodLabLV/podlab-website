import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff, notifySlack, logToCrm } from '@/lib/portal-server';
import {
  ELEMENTS,
  ELEMENT_KEYS,
  PRODUCT_KEYS,
  parseAnswer,
  scoreAnswer,
  type ElementKey,
  type ElementState,
} from '@/lib/growth-chain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATES: ElementState[] = ['locked', 'building', 'unlocked'];
const LAYERS = [...ELEMENT_KEYS, 'br'];

/**
 * POST — a client answers the eight-element check (all of it or part). Scores
 * are recomputed here from the raw answers; a score sent by the browser is ignored.
 */
export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let payload: { answers?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];
  for (const [key, raw] of Object.entries(payload.answers ?? {})) {
    const el = ELEMENTS.find((e) => e.key === key);
    if (!el) return NextResponse.json({ error: `Unknown element ${key}` }, { status: 400 });
    const answer = parseAnswer(el, raw);
    if (!answer) return NextResponse.json({ error: `Bad answer for ${el.name}` }, { status: 400 });
    rows.push({
      client_id: caller.clientId,
      element: el.key,
      answer,
      score: scoreAnswer(el, answer),
      answered_at: now,
      updated_at: now,
    });
  }
  if (rows.length === 0) return NextResponse.json({ error: 'No answers' }, { status: 400 });

  const { data, error } = await db
    .from('portal_client_elements')
    .upsert(rows, { onConflict: 'client_id,element' })
    .select('element, score, delivered_at, state_override');

  if (error) {
    console.error('[portal] growth-chain answers failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  if (rows.length === ELEMENTS.length) {
    const line = rows
      .map((r) => `${ELEMENTS.find((e) => e.key === r.element)!.symbol} ${r.score}`)
      .join(' · ');
    await Promise.all([
      notifySlack(`*Growth Chain check completed* — ${caller.businessName}\n${line}`),
      logToCrm(db, caller, `Completed the Growth Chain check: ${line}`),
    ]);
  }

  return NextResponse.json({ elements: data });
}

/**
 * PATCH — staff only. Record a purchase, mark an element delivered, or force a
 * state. Body: { clientId, product?, remove?, element?, delivered?, override? }.
 */
export async function PATCH(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: {
    clientId?: string;
    product?: string;
    remove?: boolean;
    element?: string;
    delivered?: boolean;
    override?: string | null;
  };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  if (p.product) {
    if (!PRODUCT_KEYS.includes(p.product)) {
      return NextResponse.json({ error: `Unknown product ${p.product}` }, { status: 400 });
    }
    const { error } = p.remove
      ? await db.from('portal_client_products').delete().eq('client_id', p.clientId).eq('product', p.product)
      : await db
          .from('portal_client_products')
          .upsert(
            { client_id: p.clientId, product: p.product, source: 'staff', purchased_on: new Date().toISOString().slice(0, 10) },
            { onConflict: 'client_id,product', ignoreDuplicates: true },
          );
    if (error) {
      console.error('[portal] growth-chain product failed', error.message);
      return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
  }

  if (p.element) {
    if (!LAYERS.includes(p.element as ElementKey)) {
      return NextResponse.json({ error: `Unknown element ${p.element}` }, { status: 400 });
    }
    if (p.override != null && !STATES.includes(p.override as ElementState)) {
      return NextResponse.json({ error: `Unknown state ${p.override}` }, { status: 400 });
    }
    const row: Record<string, unknown> = {
      client_id: p.clientId,
      element: p.element,
      updated_at: new Date().toISOString(),
    };
    if (typeof p.delivered === 'boolean') row.delivered_at = p.delivered ? new Date().toISOString() : null;
    if (p.override !== undefined) row.state_override = p.override;
    const { error } = await db.from('portal_client_elements').upsert(row, { onConflict: 'client_id,element' });
    if (error) {
      console.error('[portal] growth-chain element failed', error.message);
      return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, by: staff.email });
}
