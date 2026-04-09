import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createDatabaseManager } from "./lib/database.js";
import { createBackendApp } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

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
  console.log("Starting server...");
  await connect();
  await ensureSchema();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database status: ${getDatabaseStatus() === "connected" ? "Connected" : "Disconnected"}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Login endpoint: http://localhost:${PORT}/login`);
  });
}

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startServer().catch(console.error);
