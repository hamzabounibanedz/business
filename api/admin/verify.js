/**
 * Admin auth check: GET returns { authenticated: true } if valid admin cookie.
 */
import { requireAdminAndMethods } from '../_lib/adminGuard.js';
import { catchAsync } from '../_lib/catchAsync.js';
import { sendSuccess } from '../_lib/response.js';

async function verifyHandler(req, res) {
  if (!requireAdminAndMethods(req, res, 'GET')) return;
  sendSuccess(res, { authenticated: true });
}

export default catchAsync(verifyHandler);
