/**
 * Admin bulk stock update: accept array of { id, inventory }, update up to 500 products.
 */
import { requireAdminAndMethods } from '../_lib/adminGuard.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { catchAsync } from '../_lib/catchAsync.js';
import { sendSuccess, sendError } from '../_lib/response.js';
import { UUID_REGEX } from '../_lib/constants.js';

async function handler(req, res) {
  if (!requireAdminAndMethods(req, res, 'POST')) return;

  const { updates } = req.body || {};
  if (!Array.isArray(updates) || updates.length === 0) return res.status(400).json({ error: 'لا توجد تحديثات' });
  if (updates.length > 500) return res.status(400).json({ error: 'حد أقصى 500 منتج في كل مرة' });

  const valid = [], errors = [];
  for (const u of updates) {
    if (!u.id || !UUID_REGEX.test(u.id)) { errors.push(`معرّف غير صحيح: ${u.id}`); continue; }
    const inv = Number(u.inventory);
    if (isNaN(inv) || inv < 0 || !Number.isInteger(inv)) { errors.push(`مخزون غير صحيح: ${u.id}`); continue; }
    valid.push({ id: u.id, inventory: inv });
  }
  if (valid.length === 0) return res.status(400).json({ error: 'لا توجد تحديثات صحيحة', details: errors });

  const results = await Promise.allSettled(
    valid.map(u => supabaseAdmin.from('products').update({ inventory: u.inventory }).eq('id', u.id))
  );
  const failed = results.filter(r => r.status === 'rejected' || r.value?.error).length;
  sendSuccess(res, { success: true, updated: valid.length - failed, failed, validationErrors: errors });
}

export default catchAsync(handler);
