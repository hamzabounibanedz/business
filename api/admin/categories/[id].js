/**
 * Admin single category: update (PUT) or delete (DELETE) by id.
 * Delete is blocked if category has products (409).
 */
import { requireAdminAndMethods } from '../../_lib/adminGuard.js';
import { supabaseAdmin } from '../../_lib/supabase.js';
import { validateCategory } from '../../_lib/validate.js';
import { catchAsync } from '../../_lib/catchAsync.js';
import { sendSuccess, sendError } from '../../_lib/response.js';
import { notFound } from '../../_lib/errors.js';
import { UUID_REGEX } from '../../_lib/constants.js';

async function handler(req, res) {
  if (!requireAdminAndMethods(req, res, 'PUT', 'DELETE')) return;

  const { id } = req.query;
  if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'معرّف غير صحيح' });

  if (req.method === 'PUT') {
    const v = validateCategory(req.body);
    if (!v.valid) return res.status(400).json({ error: v.error });
    const { data, error } = await supabaseAdmin.from('categories').update(v.data).eq('id', id).select().single();
    if (error) return sendError(res, error);
    if (!data) throw notFound('التصنيف غير موجود');
    return sendSuccess(res, data);
  }

  if (req.method === 'DELETE') {
    // Note: count check and delete are not atomic.
    // Acceptable for single-admin use — the DB FK constraint will catch any race condition
    // and return a 23503 FK violation which sendError handles correctly.
    const { count, error: cErr } = await supabaseAdmin
      .from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
    if (cErr) return sendError(res, cErr);
    if (count > 0) return res.status(409).json({ error: `لا يمكن الحذف — يحتوي على ${count} منتج. انقل المنتجات أولاً.` });
    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
    if (error) return sendError(res, error);
    return sendSuccess(res, { success: true });
  }
}

export default catchAsync(handler);
