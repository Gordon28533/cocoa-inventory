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
  return !!error && error.code === "ER_DUP_ENTRY";
}

export function isForeignKeyConstraintError(error) {
  return !!error && (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451);
}

export function logUnexpectedError(logger, label, error, { ignore = [] } = {}) {
  if (ignore.some((predicate) => predicate(error))) {
    return;
  }

  logger.error(`${label}:`, error);
}
