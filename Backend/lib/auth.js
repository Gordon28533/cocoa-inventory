import jwt from "jsonwebtoken";

export function createAuthMiddleware({ getDb, jwtSecret }) {
  function getBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return { error: { status: 401, body: { error: "No token provided" } } };
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return { error: { status: 401, body: { error: "Invalid authorization header format" } } };
    }

    return { token };
  }

  /**
   * Loads the user's live isActive, role, and department_id from the DB.
   * Returns { status, body } on error, or { liveRole, liveDepartmentId } on success.
   * H-1: role and department_id come from the DB, not the JWT, so changes take effect immediately.
   */
  async function loadLiveUser(userId, logLabel) {
    const db = getDb();
    if (!db || !userId) return null;

    try {
      const [[user]] = await db.execute(
        'SELECT "isActive", role, department_id FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return { status: 403, body: { error: "User not found" } };
      }

      if (user.isActive === 0 || user.isActive === false) {
        return { status: 403, body: { error: "User account is deactivated" } };
      }

      return {
        liveRole: user.role,
        liveDepartmentId: user.department_id
      };
    } catch (error) {
      console.error(`${logLabel} user check failed:`, error.message);
      return { status: 503, body: { error: "Service temporarily unavailable. Please try again." } };
    }
  }

  function sendJwtError(res, err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token", code: "INVALID_TOKEN" });
    }

    console.error("JWT verification error:", err);
    return res.status(401).json({ error: "Token verification failed" });
  }

  async function authenticateRequest(req, res, { logLabel = "Auth" } = {}) {
    const { token, error } = getBearerToken(req);
    if (error) {
      res.status(error.status).json(error.body);
      return null;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });

      const result = await loadLiveUser(decoded?.id, logLabel);

      if (result?.status) {
        res.status(result.status).json(result.body);
        return null;
      }

      // Apply live role/department from DB so stale JWT claims don't persist (H-1)
      req.user = { ...decoded };
      if (result?.liveRole !== undefined)       req.user.role          = result.liveRole;
      if (result?.liveDepartmentId !== undefined) req.user.department_id = result.liveDepartmentId;

      return req.user;
    } catch (err) {
      sendJwtError(res, err);
      return null;
    }
  }

  async function requireAuth(req, res, next) {
    const user = await authenticateRequest(req, res, { logLabel: "Auth" });
    if (!user) return;
    next();
  }

  async function requireAdmin(req, res, next) {
    const user = await authenticateRequest(req, res, { logLabel: "Admin auth" });
    if (!user) return;

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  }

  return {
    authenticateRequest,
    requireAuth,
    requireAdmin
  };
}
