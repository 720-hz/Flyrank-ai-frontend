import { describe, expect, it } from "vitest";
import { GET, getHealthStatus } from "./route";

describe("getHealthStatus", () => {
  it("returns an ok status with an ISO timestamp and a non-negative uptime", () => {
    const health = getHealthStatus();

    expect(health.status).toBe("ok");
    expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe("GET /api/health", () => {
  it("responds with a 200 and the health payload as JSON", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
    expect(typeof body.uptimeSeconds).toBe("number");
  });
});
