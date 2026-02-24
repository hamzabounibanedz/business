/**
 * Combined guard for admin-only routes: require auth + optional method check.
 * Use at the top of every admin handler to avoid repeating requireAdmin + allowMethods.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {...string} [methods] - Allowed HTTP methods (e.g. 'GET', 'POST'). If omitted, only auth is checked.
 * @returns {boolean} - false if response was sent (unauthorized or method not allowed); true to continue
 *
 * @example
 * if (!requireAdminAndMethods(req, res, 'GET', 'POST')) return;
 */
import { requireAdmin } from './auth.js';
import { allowMethods } from './guard.js';

export function requireAdminAndMethods(req, res, ...methods) {
  if (!requireAdmin(req, res)) return false;
  if (methods.length > 0 && !allowMethods(req, res, ...methods)) return false;
  return true;
}
