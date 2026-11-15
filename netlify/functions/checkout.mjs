// POST /api/checkout  {pid, secret, pack}  ->  {url}  (Stripe Checkout)
import { createHash } from 'node:crypto';
import { PACKS } from '../lib/packs.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const key = Netlify.env.get('STRIPE_SECRET_KEY') || Netlify.env.get('STREET_GANG_KEY');
  if (!key) return Response.json({ error: 'payments_not_configured' }, { status: 503 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'bad_json' }, { status: 400 }); }
  const { pid, secret, pack } = body || {};
  const p = PACKS[pack];
  if (!p || !UUID.test(pid || '') || typeof secret !== 'string' || secret.length < 20 || secret.length > 200)
    return Response.json({ error: 'bad_request' }, { status: 400 });

  const secHash = createHash('sha256').update(secret).digest('hex');
  const origin = new URL(req.url).origin;
  const f = new URLSearchParams({
    mode: 'payment',
    client_reference_id: pid,
    success_url: `${origin}/?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1`,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(p.cents),
    'line_items[0][price_data][product_data][name]': `Street Hustle Gang — ${p.name}`,
    'line_items[0][price_data][product_data][description]': 'In-game currency. No real-world value, not redeemable for money. All sales final.',
    'metadata[pid]': pid,
    'metadata[sec_hash]': secHash,
    'metadata[pack]': pack,
    'payment_intent_data[metadata][pid]': pid,
    'payment_intent_data[metadata][pack]': pack,
  });

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: f,
  });
  const j = await r.json();
  if (!r.ok) { console.error('stripe', j?.error?.message); return Response.json({ error: 'stripe_error', code: j?.error?.code || j?.error?.type || null }, { status: 502 }); }
  return Response.json({ url: j.url });
};

export const config = { path: '/api/checkout', method: 'POST' };
