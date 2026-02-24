/**
 * Order submission proxy: validates payload, forwards to Google Sheets webhook,
 * returns 200 quickly and runs stock decrement in background. Set GOOGLE_WEBHOOK_URL in Vercel.
 */
import { supabaseAdmin } from './_lib/supabase.js';
import { catchAsync } from './_lib/catchAsync.js';
import { allowMethods } from './_lib/guard.js';

const GOOGLE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL;

async function handler(req, res) {
  if (!allowMethods(req, res, 'POST')) return;

  if (!GOOGLE_WEBHOOK_URL) {
    return res.status(500).json({ success: false, error: 'Webhook URL not set' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ success: false, error: 'Missing body' });
  }

  const { items, customer } = body;
  const name = customer?.firstName || customer?.lastName || body.name;
  const phone = customer?.phone || body.phone;
  const wilaya = customer?.wilaya || body.wilaya;
  if (!name || !phone || !wilaya) {
    return res.status(400).json({ success: false, error: 'الاسم والهاتف والولاية مطلوبة' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'عناصر الطلب مطلوبة' });
  }
  const bodyString = JSON.stringify(body);

  let response;
  try {
    response = await fetch(GOOGLE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyString,
    });
  } catch (fetchErr) {
    console.error('Webhook fetch failed:', fetchErr.message);
    return res.status(502).json({
      success: false,
      error: 'فشل إرسال الطلب. يرجى المحاولة لاحقاً.',
      detail: fetchErr.code === 'ENOTFOUND' ? 'لا يمكن الاتصال بخادم الطلبات (تحقق من الاتصال أو استخدم النشر المباشر).' : fetchErr.message
    });
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { success: response.ok, raw: text };
  }

  if (response.ok) {
    // Return immediately so the client gets a fast response; run stock decrement in background
    if (Array.isArray(items) && items.length > 0) {
      Promise.allSettled(
        items.map(item =>
          supabaseAdmin.rpc('decrement_inventory', { p_id: item.id, qty: item.quantity })
        )
      ).catch(stockErr => console.error('Stock decrement failed (order still recorded):', stockErr.message));
    }
    return res.status(200).json({ success: true });
  }
  return res.status(502).json({ success: false, error: 'فشل إرسال الطلب. يرجى المحاولة لاحقاً.', ...data });
}

export default catchAsync(handler);
