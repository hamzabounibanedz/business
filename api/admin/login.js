/**
 * Admin login: POST { username, password } → Set-Cookie (JWT). Rate-limited by IP.
 */
import bcrypt from 'bcryptjs';
import { makeAuthCookie } from '../_lib/auth.js';
import { catchAsync } from '../_lib/catchAsync.js';
import { allowMethods, attemptLogin, resetLogin } from '../_lib/guard.js';
import { sendError, sendSuccess } from '../_lib/response.js';

async function loginHandler(req, res) {
  if (!allowMethods(req, res, 'POST', 'OPTIONS')) return;
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const { blocked } = attemptLogin(ip);
  if (blocked) return res.status(429).json({ error: 'محاولات كثيرة — انتظر 15 دقيقة' });

  const { username, password } = req.body || {};
  if (!username || !password || username.length > 100 || password.length > 200) {
    return res.status(400).json({ error: 'بيانات غير صحيحة' });
  }

  const ADMIN_USERNAME      = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
    return res.status(500).json({ error: 'خطأ في إعداد الخادم' });
  }

  // Always run bcrypt.compare — prevents timing attacks
  const passwordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  const usernameValid = username === ADMIN_USERNAME;
  if (!usernameValid || !passwordValid) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  resetLogin(ip);
  res.setHeader('Set-Cookie', makeAuthCookie({ username }));
  sendSuccess(res, { success: true });
}

export default catchAsync(loginHandler);
