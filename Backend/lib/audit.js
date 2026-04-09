export function createAuditLogger({ getDb, logger = console }) {
  return async function logAudit(userId, action, requisitionId) {
    const db = getDb();
    if (!db) {
      return;
    }

    try {
      await db.execute(
        "INSERT INTO audit_logs (user_id, action, requisition_id) VALUES (?, ?, ?)",
        [userId, action, requisitionId]
      );
    } catch (error) {
      logger.error("Failed to log audit:", error);
    }
  };
}
