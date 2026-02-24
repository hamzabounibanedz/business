import { requireAdmin } from '../_lib/auth.js';
import { catchAsync } from '../_lib/catchAsync.js';
import { allowMethods } from '../_lib/guard.js';
import { sendSuccess } from '../_lib/response.js';

async function verifyHandler(req, res) {
  if (!allowMethods(req, res, 'GET')) return;
  if (!requireAdmin(req, res)) return;
  sendSuccess(res, { authenticated: true });
}

export default catchAsync(verifyHandler);
