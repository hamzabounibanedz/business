/**
 * Admin products API: list all products (GET) or create one (POST).
 * Response shape is raw DB (admin panel expects name_ar, sku, etc.).
 */
import { requireAdminAndMethods } from '../_lib/adminGuard.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { validateProduct } from '../_lib/validate.js';
import { catchAsync } from '../_lib/catchAsync.js';
import { sendSuccess, sendError } from '../_lib/response.js';

async function handler(req, res) {
  if (!requireAdminAndMethods(req, res, 'GET', 'POST')) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id,sku,name_ar,name_en,description_ar,price,inventory,category_id,sizes,images,tags,is_active,is_featured,sort_order,created_at,updated_at,categories(id,name_ar,slug)')
      .order('created_at', { ascending: false });
    if (error) return sendError(res, error);
    return sendSuccess(res, data || []);
  }

  if (req.method === 'POST') {
    const v = validateProduct(req.body);
    if (!v.valid) return res.status(400).json({ error: v.error });
    const { data, error } = await supabaseAdmin.from('products').insert([v.data]).select().single();
    if (error) return sendError(res, error);
    return sendSuccess(res, data, 201);
  }
}

export default catchAsync(handler);
