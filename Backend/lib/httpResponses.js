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

/**
 * 500 response.
 *
 * Pass the caught `error` as the third argument. Three separate PostgreSQL
 * faults in this codebase — an untyped bind parameter, a missing column, and a
 * boolean sent to a smallint — each surfaced to the user as nothing but
 * "Failed to ...", because the real message never left the server. The database
 * had named the problem precisely every time.
 *
 * What gets returned:
 *   - `code`: the SQLSTATE (e.g. "22P02"). Safe to expose anywhere — it names
 *     the class of failure without revealing schema, query text or values.
 *   - `detail` / `hint` / `constraint`: the full diagnostics, but ONLY outside
 *     production, since those can echo column names and submitted values.
 */
export function serverError(res, message, error = null) {
  const extra = {};

  if (error) {
    if (error.code) extra.code = error.code;

    if (process.env.NODE_ENV !== "production") {
      if (error.message)    extra.detail     = error.message;
      if (error.detail)     extra.dbDetail   = error.detail;
      if (error.hint)       extra.hint       = error.hint;
      if (error.constraint) extra.constraint = error.constraint;
    }
  }

  return sendJsonError(res, 500, message, extra);
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

  // Log each PostgreSQL diagnostic field on its own line. Passing the bare error
  // object to console.error renders it as "[Error: ...]" in Render's log viewer,
  // with code/detail/hint omitted — which is precisely the information needed to
  // identify a type or schema fault.
  logger.error(`${label}: ${error?.message ?? error}`);
  if (error?.code)       logger.error(`  pg code:    ${error.code}`);
  if (error?.detail)     logger.error(`  detail:     ${error.detail}`);
  if (error?.hint)       logger.error(`  hint:       ${error.hint}`);
  if (error?.constraint) logger.error(`  constraint: ${error.constraint}`);
  if (error?.table)      logger.error(`  table:      ${error.table}`);
  if (error?.column)     logger.error(`  column:     ${error.column}`);
  if (error?.stack)      logger.error(error.stack);
}
