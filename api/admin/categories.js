import { requireAdmin } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { validateCategory } from '../_lib/validate.js';
import { catchAsync } from '../_lib/catchAsync.js';
import { allowMethods } from '../_lib/guard.js';
import { sendSuccess, sendError } from '../_lib/response.js';

async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!allowMethods(req, res, 'GET', 'POST')) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('categories').select('*').order('sort_order');
    if (error) return sendError(res, error);
    return sendSuccess(res, data || []);
  }

  if (req.method === 'POST') {
    const v = validateCategory(req.body);
    if (!v.valid) return res.status(400).json({ error: v.error });
    const { data, error } = await supabaseAdmin.from('categories').insert([v.data]).select().single();
    if (error) return sendError(res, error);
    return sendSuccess(res, data, 201);
  }
}

export default catchAsync(handler);
