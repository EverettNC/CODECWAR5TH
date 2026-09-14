import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fusedClaim, sourcesKept, sourcesLost } from "./war.ts";

describe("fusedClaim", () => {
  it("joins what was said and invents nothing", () => {
    assert.equal(fusedClaim(["Stay with me.", "Get out of the house.", "I am here."]), "Stay with me. Get out of the house. I am here.");
  });

  it("drops empty ear", () => {
    assert.equal(fusedClaim([null, "", "  ", "I am here."]), "I am here.");
    assert.equal(fusedClaim([null, undefined, ""]), null);
  });
});

describe("sources", () => {
  it("house keeps every canal", () => {
    assert.equal(sourcesKept(3, "canals"), 3);
    assert.equal(sourcesLost(3, "canals"), 0);
  });

  it("mix keeps one mouth", () => {
    assert.equal(sourcesKept(3, "fused"), 1);
    assert.equal(sourcesLost(3, "fused"), 2);
  });

  it("empty field stays empty", () => {
    assert.equal(sourcesKept(0, "fused"), 0);
    assert.equal(sourcesLost(0, "canals"), 0);
  });
});
