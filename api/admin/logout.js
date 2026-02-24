import { clearAuthCookie } from '../_lib/auth.js';
import { catchAsync } from '../_lib/catchAsync.js';
import { allowMethods } from '../_lib/guard.js';
import { sendSuccess } from '../_lib/response.js';

async function handler(req, res) {
  if (!allowMethods(req, res, 'POST')) return;
  res.setHeader('Set-Cookie', clearAuthCookie());
  sendSuccess(res, { success: true });
}

export default catchAsync(handler);
