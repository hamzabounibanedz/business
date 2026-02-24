import { requireAdmin } from '../../_lib/auth.js';
import { supabaseAdmin } from '../../_lib/supabase.js';
import { validateProduct } from '../../_lib/validate.js';
import { catchAsync } from '../../_lib/catchAsync.js';
import { allowMethods } from '../../_lib/guard.js';
import { sendSuccess, sendError } from '../../_lib/response.js';
import { notFound } from '../../_lib/errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!allowMethods(req, res, 'PUT', 'DELETE')) return;

  const { id } = req.query;
  if (!UUID.test(id)) return res.status(400).json({ error: 'معرّف غير صحيح' });

  if (req.method === 'PUT') {
    const v = validateProduct(req.body);
    if (!v.valid) return res.status(400).json({ error: v.error });
    const { data, error } = await supabaseAdmin.from('products').update(v.data).eq('id', id).select().single();
    if (error) return sendError(res, error);
    if (!data) throw notFound('المنتج غير موجود');
    return sendSuccess(res, data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
    if (error) return sendError(res, error);
    return sendSuccess(res, { success: true });
  }
}

export default catchAsync(handler);
