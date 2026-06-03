import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createDatabaseManager } from "./lib/database.js";
import { createBackendApp } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

// L-2: Validate all required environment variables before anything else starts
function validateEnv() {
  const required = ["JWT_SECRET", "DB_HOST", "DB_USER", "DB_NAME"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGIN) {
    console.error("FATAL: CORS_ORIGIN must be set in production.");
    process.exit(1);
  }
}

validateEnv();

if (process.env.NODE_ENV !== "production") {
  console.log("Loaded environment variables for development.");
}

const PORT = process.env.PORT || 5000;

const databaseManager = createDatabaseManager();
const { connect, ensureSchema, getDatabaseStatus } = databaseManager;
const { app } = createBackendApp({
  env: process.env,
  buildDir: join(__dirname, "..", "build"),
  databaseManager
});

async function startServer() {
  console.log("Starting server…");
  await connect();
  await ensureSchema();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database status: ${getDatabaseStatus() === "connected" ? "Connected" : "Disconnected"}`);
    console.log(`Health check:    http://localhost:${PORT}/health`);
    console.log(`Login endpoint:  http://localhost:${PORT}/login`);
  });
}

// C-5: Log and exit on uncaught exceptions — running after one is undefined behaviour
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception — shutting down:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
