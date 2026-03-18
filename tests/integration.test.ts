import { describe, it, expect } from "vitest";
import { Dealscope } from "../src/core.js";

describe("Dealscope integration", () => {
  it("handles concurrent ops", async () => {
    const c = new Dealscope();
    await Promise.all([c.detect({a:1}), c.detect({b:2}), c.detect({c:3})]);
    expect(c.getStats().ops).toBe(3);
  });
  it("returns service name", async () => {
    const c = new Dealscope();
    const r = await c.detect();
    expect(r.service).toBe("dealscope");
  });
  it("handles 100 ops", async () => {
    const c = new Dealscope();
    for (let i = 0; i < 100; i++) await c.detect({i});
    expect(c.getStats().ops).toBe(100);
  });
});
