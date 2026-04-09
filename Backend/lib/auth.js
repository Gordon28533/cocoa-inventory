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

  async function ensureUserIsActive(userId, logLabel) {
    const db = getDb();
    if (!db || !userId) {
      return null;
    }

    try {
      const [[user]] = await db.execute("SELECT isActive FROM users WHERE id = ?", [userId]);
      if (user && (user.isActive === 0 || user.isActive === false)) {
        return { status: 403, body: { error: "User account is deactivated" } };
      }
    } catch (error) {
      console.error(`${logLabel} active user check failed:`, error.message);
    }

    return null;
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
      const decoded = jwt.verify(token, jwtSecret);
      const inactiveResponse = await ensureUserIsActive(decoded?.id, logLabel);
      if (inactiveResponse) {
        res.status(inactiveResponse.status).json(inactiveResponse.body);
        return null;
      }

      req.user = decoded;
      return decoded;
    } catch (err) {
      sendJwtError(res, err);
      return null;
    }
  }

  async function requireAuth(req, res, next) {
    const user = await authenticateRequest(req, res, { logLabel: "Auth" });
    if (!user) {
      return;
    }

    next();
  }

  async function requireAdmin(req, res, next) {
    const user = await authenticateRequest(req, res, { logLabel: "Admin auth" });
    if (!user) {
      return;
    }

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
