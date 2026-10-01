import { describe, expect, it } from "vitest";
import { buildRequestOrigin } from "./request-origin";

describe("buildRequestOrigin", () => {
  it("uses http for localhost", () => {
    expect(buildRequestOrigin("localhost:3000")).toBe("http://localhost:3000");
  });

  it("uses http for 127.0.0.1", () => {
    expect(buildRequestOrigin("127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  });

  it("uses https for a deployed domain", () => {
    expect(buildRequestOrigin("flyrank-console.vercel.app")).toBe(
      "https://flyrank-console.vercel.app",
    );
  });
});
