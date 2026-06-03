export function createAuditLogger({ getDb, logger = console }) {
  /**
   * Records an action in audit_logs.
   * @param {number}      userId      - ID of the user performing the action
   * @param {string}      action      - Verb describing what happened (e.g. "create_user")
   * @param {string|null} entityId    - Primary key or batch ID of the affected record
   * @param {string|null} details     - Optional JSON/text payload for richer context (H-5)
   */
  return async function logAudit(userId, action, entityId = null, details = null) {
    const db = getDb();
    if (!db) return;

    try {
      await db.execute(
        "INSERT INTO audit_logs (user_id, action, requisition_id, details) VALUES (?, ?, ?, ?)",
        [userId, action, entityId != null ? String(entityId) : null, details]
      );
    } catch (error) {
      logger.error("Failed to log audit:", error);
    }
  };
}
