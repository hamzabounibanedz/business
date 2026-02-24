/**
 * Wraps an async Vercel handler so unhandled promise rejections
 * are caught and forwarded to sendError instead of crashing.
 */
import { sendError } from './response.js';

export function catchAsync(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      sendError(res, err);
    }
  };
}
