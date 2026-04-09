import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMockDatabaseManager, fetchJson, withTestApp } from "./testUtils.js";

describe("Backend /health endpoint", () => {
  it("returns status, database state, and timestamp", async () => {
    await withTestApp(
      {
        databaseManager: createMockDatabaseManager()
      },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/health");

        assert.equal(response.status, 200);
        assert.equal(data.status, "ok");
        assert.equal(data.database, "disconnected");
        assert.ok(Object.hasOwn(data, "timestamp"));
      }
    );
  });
});
