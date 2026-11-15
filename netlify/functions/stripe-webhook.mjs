// POST /api/stripe-webhook — Stripe calls this; credits paid cash into Supabase.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PACKS } from '../lib/packs.mjs';

function verify(raw, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map(s => s.split('=')).filter(a => a.length === 2 && a[0] !== 'v1'));
  const sigs = header.split(',').filter(s => s.startsWith('v1=')).map(s => s.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const exp = Buffer.from(createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex'));
  return sigs.some(s => { const b = Buffer.from(s); return b.length === exp.length && timingSafeEqual(b, exp); });
}

async function sb(path, init) {
  const url = Netlify.env.get('SUPABASE_URL') || 'https://ndgzurnarggbsgsjegva.supabase.co';
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`supabase ${r.status} ${await r.text()}`);
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const raw = await req.text();
  if (!verify(raw, req.headers.get('stripe-signature'), Netlify.env.get('STRIPE_WEBHOOK_SECRET')))
    return new Response('bad signature', { status: 400 });

  const ev = JSON.parse(raw);
  const o = ev.data?.object || {};
  try {
    if ((ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') && o.payment_status === 'paid') {
      const m = o.metadata || {};
      const p = PACKS[m.pack];
      if (!p || !m.pid || !m.sec_hash) return new Response('ignored', { status: 200 });
      // Compare pre-tax USD subtotal (Adaptive Pricing / Managed Payments change amount_total + currency).
      const usdSub = o.currency_conversion ? o.currency_conversion.amount_subtotal : (o.currency === 'usd' ? o.amount_subtotal : null);
      if (usdSub !== p.cents) { console.error('amount mismatch', o.id, usdSub); return new Response('amount mismatch', { status: 200 }); }
      await sb('sh_purchases?on_conflict=session_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ session_id: o.id, pid: m.pid, sec_hash: m.sec_hash, pack: m.pack, cash: p.cash, amount_cents: p.cents, payment_intent: o.payment_intent || null }),
      });
    } else if (ev.type === 'charge.dispute.created' && o.payment_intent) {
      // Chargeback: claw back the cash the same way as a refund.
      await sb(`sh_purchases?payment_intent=eq.${encodeURIComponent(o.payment_intent)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'refunded' }),
      });
    } else if (ev.type === 'charge.refunded' && o.refunded && o.payment_intent) {
      await sb(`sh_purchases?payment_intent=eq.${encodeURIComponent(o.payment_intent)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'refunded' }),
      });
    }
  } catch (e) {
    console.error(e);
    return new Response('retry', { status: 500 }); // Stripe retries
  }
  return new Response('ok', { status: 200 });
};

export const config = { path: '/api/stripe-webhook', method: 'POST' };
