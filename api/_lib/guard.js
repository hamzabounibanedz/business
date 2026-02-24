/**
 * Method guard (405 + Allow header) and in-memory login rate limit.
 * In-memory is sufficient for a single-admin panel: no Redis, resets on cold start,
 * and limits brute-force from a single IP until the window expires.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

/** @type {Map<string, { count: number, firstAttemptAt: number }>} */
const attempts = new Map();

/**
 * Returns false and sends 405 with Allow header if method not in list; otherwise true.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {...string} methods
 * @returns {boolean}
 */
export function allowMethods(req, res, ...methods) {
  const allowed = [...new Set(methods)].filter(Boolean);
  if (!allowed.includes(req.method)) {
    res.setHeader('Allow', allowed.join(', '));
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

/**
 * Call before bcrypt.compare. Blocks after 10 failures in 15 minutes per IP.
 * @param {string} ip
 * @returns {{ blocked: boolean, remaining: number }}
 */
export function attemptLogin(ip) {
  const now = Date.now();
  let entry = attempts.get(ip);
  if (entry) {
    if (now - entry.firstAttemptAt > WINDOW_MS) {
      entry = { count: 0, firstAttemptAt: now };
      attempts.set(ip, entry);
    }
  } else {
    entry = { count: 0, firstAttemptAt: now };
    attempts.set(ip, entry);
  }
  entry.count += 1;
  const blocked = entry.count >= MAX_ATTEMPTS;
  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);
  return { blocked, remaining };
}

/**
 * Call on successful login to reset the counter for this IP.
 * @param {string} ip
 */
export function resetLogin(ip) {
  attempts.delete(ip);
}
