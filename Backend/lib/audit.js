export function createAuditLogger({ getDb, logger = console }) {
  /**
   * Records an action in audit_logs.
   *
   * @param {number}      userId      - ID of the user performing the action
   * @param {string}      action      - Verb describing what happened (e.g. "create_user")
   * @param {string|null} entityId    - Requisition id or batch id of the affected record
   * @param {string|null} details     - Optional JSON/text payload for richer context (H-5)
   *
   * A failure here used to be swallowed by a bare `logger.error("Failed to log
   * audit:", error)`. Combined with requisition_id being INTEGER while every
   * requisition action logs a hex batch_id, that meant the entire requisition
   * lifecycle went unaudited for the whole pilot and nothing surfaced it: the
   * approval returned 200, the user saw success, and the row was never written.
   *
   * The column is now textual, so this should not recur. The logging below
   * exists so that if it ever does, it is impossible to miss: the message says
   * what was lost, not merely that something went wrong.
   */
  return async function logAudit(userId, action, entityId = null, details = null) {
    const db = getDb();
    if (!db) {
      logger.error(
        `AUDIT NOT RECORDED — no database handle. action="${action}" ` +
        `user=${userId} entity=${entityId}. The operation itself still ran.`
      );
      return;
    }

    try {
      await db.execute(
        "INSERT INTO audit_logs (user_id, action, requisition_id, details) VALUES (?, ?, ?, ?)",
        [userId, action, entityId != null ? String(entityId) : null, details]
      );
    } catch (error) {
      // Deliberately not rethrown: the caller has already changed state, and
      // failing the request here would show the user an error for work that
      // actually succeeded. The trade-off is recorded loudly instead.
      logger.error(
        `AUDIT NOT RECORDED — action="${action}" user=${userId} ` +
        `entity=${entityId == null ? "null" : `"${entityId}"`} ` +
        `(${typeof entityId}). This action has NO accountability record. ` +
        `code=${error?.code} detail=${error?.detail} column=${error?.column}`
      );
      logger.error(error);
    }
  };
}
