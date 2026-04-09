export function createRateLimiter({ attempts = new Map(), env = process.env } = {}) {
  function rateLimit(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    const isProd = env.NODE_ENV === "production";
    const windowMs = isProd ? 15 * 60 * 1000 : 2 * 60 * 1000;
    const maxAttempts = isProd ? 5 : 20;

    if (!attempts.has(ip)) {
      attempts.set(ip, { count: 0, resetTime: now + windowMs });
    }

    const current = attempts.get(ip);

    if (now > current.resetTime) {
      current.count = 0;
      current.resetTime = now + windowMs;
    }

    if (current.count >= maxAttempts) {
      return res.status(429).json({
        error: "Too many login attempts. Please try again later.",
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
    }

    current.count++;
    next();
  }

  return {
    loginAttempts: attempts,
    rateLimit
  };
}

export function expectsApiResponse(req) {
  const acceptHeader = req.get("accept") || "";
  const contentType = req.get("content-type") || "";

  return (
    req.method !== "GET" ||
    req.path.startsWith("/api/") ||
    !!req.headers.authorization ||
    acceptHeader.includes("application/json") ||
    contentType.includes("application/json")
  );
}

export function apiNotFoundHandler(req, res, next) {
  if (expectsApiResponse(req)) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  next();
}

export function globalErrorHandler(err, req, res, next) {
  console.error("Global error handler:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
  });
}
