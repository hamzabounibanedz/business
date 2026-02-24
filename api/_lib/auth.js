import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { config } from 'dotenv';
import { resolve } from 'path';

if (!process.env.JWT_SECRET) {
  config({ path: resolve(process.cwd(), '.env.local') });
}

const COOKIE_NAME = 'matjari_admin_token';
const JWT_SECRET  = process.env.JWT_SECRET;
const SESSION_HOURS = 8;

if (!JWT_SECRET) console.error('JWT_SECRET env var is not set');

/**
 * Verifies the admin JWT from the cookie. Returns decoded payload if valid and role is admin, else null.
 * @param {import('http').IncomingMessage} req
 * @returns {object|null}
 */
export function verifyAdminToken(req) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies[COOKIE_NAME];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch { return null; }
}

/**
 * Builds the Set-Cookie header value for a successful admin login.
 * @param {object} payload - e.g. { username }
 * @returns {string}
 */
export function makeAuthCookie(payload) {
  const maxAge = SESSION_HOURS * 3600;
  const token = jwt.sign({ ...payload, role: 'admin' }, JWT_SECRET, { expiresIn: maxAge });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

/**
 * Builds the Set-Cookie header value to clear the admin cookie (logout).
 * @returns {string}
 */
export function clearAuthCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

/**
 * Call at top of every protected route. Sends the response itself on failure (401) and returns false;
 * returns true if authenticated. OPTIONS is always allowed and returns false without sending 401.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {boolean}
 */
export function requireAdmin(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return false; }
  if (!verifyAdminToken(req)) {
    res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول' });
    return false;
  }
  return true;
}
