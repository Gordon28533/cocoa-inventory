import fetch from "node-fetch";

describe("/login endpoint", () => {
  it("should fail with invalid credentials", async () => {
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffName: "wronguser", password: "wrongpass" }),
    });
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.message).toMatch(/invalid credentials/i);
  });

  // Uncomment and adjust this test if you have a known test user in your DB
  // it("should succeed with valid credentials", async () => {
  //   const response = await fetch("http://localhost:5000/login", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ staffName: "testuser", password: "test123" }),
  //   });
  //   expect(response.status).toBe(200);
  //   const data = await response.json();
  //   expect(data.success).toBe(true);
  //   expect(data.token).toBeDefined();
  // });

}); 