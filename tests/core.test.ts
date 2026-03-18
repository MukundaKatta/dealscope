import { describe, it, expect } from "vitest";
import { Dealscope } from "../src/core.js";
describe("Dealscope", () => {
  it("init", () => { expect(new Dealscope().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Dealscope(); await c.detect(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Dealscope(); await c.detect(); c.reset(); expect(c.getStats().ops).toBe(0); });
});
