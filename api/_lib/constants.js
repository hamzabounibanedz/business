/**
 * Shared constants for API routes.
 * Centralizes patterns (e.g. UUID) so validation is consistent and DRY.
 */

/** UUID v4 pattern for validating route params (e.g. product id, category id). */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
