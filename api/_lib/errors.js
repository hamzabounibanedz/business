/**
 * Centralized HTTP error class and factory helpers.
 * Handlers throw these; sendError in response.js maps them to status + JSON.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function badRequest(msg) {
  return new AppError(msg || 'طلب غير صالح', 400);
}

export function unauthorized(msg) {
  return new AppError(msg || 'غير مصرح', 401);
}

export function notFound(msg) {
  return new AppError(msg || 'غير موجود', 404);
}

export function conflict(msg) {
  return new AppError(msg || 'تعارض', 409);
}

export function methodNotAllowed(allowed) {
  const methods = Array.isArray(allowed) ? allowed.join(', ') : String(allowed);
  return new AppError(`Method not allowed. Allowed: ${methods}`, 405);
}
