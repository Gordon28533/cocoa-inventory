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
  const app = express();
  const jwtSecret = env.JWT_SECRET || "fallback_secret_key_change_in_production";
  const { getDb, getDatabaseStatus, requireDatabase } = databaseManager;
  const { loginAttempts, rateLimit } = rateLimiter;
  const logAudit = createAuditLogger({ getDb, logger });

  app.use(
    cors({
      origin:
        env.NODE_ENV === "production"
          ? ["https://yourdomain.com", "https://www.yourdomain.com"]
          : ["http://localhost:3000", "http://localhost:5001", "http://127.0.0.1:3000"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );
  app.use(
    morgan("dev", {
      skip: () => env.NODE_ENV === "test"
    })
  );

  if (buildDir) {
    app.use(express.static(buildDir));
  }

  const { requireAuth, requireAdmin } = createAuthMiddleware({
    getDb,
    jwtSecret
  });

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
      requireDatabase
    })
  );
  app.use(
    createUserRouter({
      getDb,
      requireAdmin,
      requireDatabase
    })
  );
  app.use(
    createInventoryRouter({
      getDb,
      requireAuth,
      requireDatabase
    })
  );
  app.use(
    createDepartmentRouter({
      getDb,
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
