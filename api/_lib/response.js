/**
 * Centralized response helpers. Keeps response shape consistent so admin panel
 * and storefront can rely on data.error, data.success, data.url, data.authenticated.
 * We send payload directly (no wrapping in { data }) for backwards compatibility.
 */
import { AppError } from './errors.js';

/**
 * Send success response. For backwards compatibility:
 * - Arrays and objects are sent as-is (not wrapped in { success: true, data }).
 * @param {import('http').ServerResponse} res
 * @param {*} data - Payload to send (array, object, etc.)
 * @param {number} [statusCode=200]
 */
export function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json(data);
}

/**
 * Send error response. AppError → statusCode + message; Supabase 23505/23503 → 409
 * with Arabic message; otherwise 500 with generic Arabic message. Never leaks stack.
 * @param {import('http').ServerResponse} res
 * @param {Error|AppError|{ code?: string, message?: string }} err
 */
export function sendError(res, err) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  const code = err?.code;
  if (code === '23505') {
    return res.status(409).json({ error: 'القيمة مكررة — مستخدم مسبقاً' });
  }
  if (code === '23503') {
    return res.status(409).json({ error: 'مرجع غير صالح — مرتبط ببيانات أخرى' });
  }
  console.error(err);
  res.status(500).json({ error: 'خطأ في الخادم' });
}
