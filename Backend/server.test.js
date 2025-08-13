import fetch from "node-fetch";

describe("Backend /health endpoint", () => {
  it("should return status ok and database status", async () => {
    const response = await fetch("http://localhost:5000/health");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("status", "ok");
    expect(data).toHaveProperty("database");
    expect(data).toHaveProperty("timestamp");
  });
}); 