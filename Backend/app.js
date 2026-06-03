import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createAuditLogger } from "./lib/audit.js";
import { createAuthMiddleware } from "./lib/auth.js";
import { createDatabaseManager } from "./lib/database.js";
import { apiNotFoundHandler, createRateLimiter, globalErrorHandler } from "./lib/http.js";
import { createAuthRouter } from "./routes/authRoutes.js";
import { createUserRouter } from "./routes/userRoutes.js";
import { createInventoryRouter } from "./routes/inventoryRoutes.js";
import { createDepartmentRouter } from "./routes/departmentRoutes.js";
import { createRequisitionRouter } from "./routes/requisitionRoutes.js";

export function createBackendApp({
  env = process.env,
  logger = console,
  buildDir = null,
  databaseManager = createDatabaseManager({ env, logger }),
  rateLimiter = createRateLimiter({ env })
} = {}) {
  // C-2: Refuse to start with an insecure JWT secret
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("FATAL: JWT_SECRET environment variable is not set. Refusing to start.");
  }

  const app = express();
  const { getDb, getDatabaseStatus, requireDatabase } = databaseManager;
  const { loginAttempts, rateLimit } = rateLimiter;
  const logAudit = createAuditLogger({ getDb, logger });

  // C-4: CORS origin must be configured explicitly in production
  const corsOrigin =
    env.NODE_ENV === "production"
      ? (env.CORS_ORIGIN || (() => { throw new Error("FATAL: CORS_ORIGIN is not set in production."); })())
          .split(",")
          .map((o) => o.trim())
      : ["http://localhost:3000", "http://localhost:5001", "http://127.0.0.1:3000"];

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
    })
  );

  app.use(express.json({ limit: "10mb" }));

  // H-4: Configure a real CSP instead of disabling it
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'"],
          styleSrc:   ["'self'", "'unsafe-inline'"],
          imgSrc:     ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc:    ["'self'"],
          objectSrc:  ["'none'"],
          frameAncestors: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );

  // M-8: Use structured log format in production, colorised dev format locally
  app.use(
    morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
      skip: () => env.NODE_ENV === "test"
    })
  );

  if (buildDir) {
    app.use(express.static(buildDir));
  }

  const { requireAuth, requireAdmin } = createAuthMiddleware({ getDb, jwtSecret });

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      database: getDatabaseStatus(),
      timestamp: new Date().toISOString()
    });
  });

  app.get("/ws", (req, res) => {
    res.status(200).send("WebSocket endpoint not implemented.");
  });

  app.use(
    createAuthRouter({
      getDb,
      jwtSecret,
      loginAttempts,
      rateLimit,
      requireAuth,
      requireAdmin,
      requireDatabase,
      logAudit
    })
  );
  app.use(
    createUserRouter({
      getDb,
      requireAdmin,
      requireDatabase,
      logAudit
    })
  );
  app.use(
    createInventoryRouter({
      getDb,
      requireAuth,
      requireDatabase,
      logAudit
    })
  );
  app.use(
    createDepartmentRouter({
      getDb,
      requireAuth,
      requireAdmin,
      requireDatabase
    })
  );
  app.use(
    createRequisitionRouter({
      getDb,
      requireAuth,
      requireDatabase,
      logAudit
    })
  );

  app.use(apiNotFoundHandler);

  if (buildDir) {
    app.get("*", (req, res) => {
      res.sendFile(`${buildDir}/index.html`);
    });
  }

  app.use(globalErrorHandler);

  return {
    app,
    databaseManager,
    rateLimiter,
    requireAuth,
    requireAdmin
  };
}
