export function sendJsonError(res, status, message, extra = {}) {
  return res.status(status).json({ error: message, ...extra });
}

export function badRequest(res, message, extra) {
  return sendJsonError(res, 400, message, extra);
}

export function unauthorized(res, message, extra) {
  return sendJsonError(res, 401, message, extra);
}

export function forbidden(res, message, extra) {
  return sendJsonError(res, 403, message, extra);
}

export function notFound(res, message, extra) {
  return sendJsonError(res, 404, message, extra);
}

export function serverError(res, message) {
  return sendJsonError(res, 500, message);
}

export function isDuplicateEntryError(error) {
  if (!error) return false;
  // PostgreSQL unique violation
  if (error.code === "23505") return true;
  // mysql2 legacy (kept for local dev compatibility)
  if (error.code === "ER_DUP_ENTRY") return true;
  return false;
}

export function isForeignKeyConstraintError(error) {
  if (!error) return false;
  // PostgreSQL foreign key violation
  if (error.code === "23503") return true;
  // mysql2 legacy
  if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) return true;
  return false;
}

export function logUnexpectedError(logger, label, error, { ignore = [] } = {}) {
  if (ignore.some((predicate) => predicate(error))) {
    return;
  }

  logger.error(`${label}:`, error);
}
