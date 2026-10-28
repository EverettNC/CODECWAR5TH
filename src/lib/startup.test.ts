import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * startup.sh must not call anything that is not in the repo. It once ran
 * "node scripts/preview.mjs stop", a file that never existed, and hid the
 * failure behind "|| true". Starting the server for real is not part of
 * npm test (it binds a port); it was run by hand on a spare port.
 */

const ROOT = join(import.meta.dirname, "..", "..");
const SCRIPT = join(ROOT, "startup.sh");
const text = readFileSync(SCRIPT, "utf8");
const lines = text.split("\n").filter((l) => !l.trim().startsWith("#"));

describe("startup.sh", () => {
  it("is valid sh and executable", () => {
    execFileSync("sh", ["-n", SCRIPT]);
    assert.ok(statSync(SCRIPT).mode & 0o100, "owner execute bit");
  });

  it("every script or binary it runs from the repo exists", () => {
    const missing: string[] = [];
    for (const line of lines) {
      for (const m of line.matchAll(/\bnode\s+([\w./-]+\.(?:mjs|js|cjs|ts))/g)) {
        if (!existsSync(join(ROOT, m[1]!))) missing.push(m[1]!);
      }
      for (const m of line.matchAll(/(?:^|\s)((?:scripts|node_modules)\/[\w./-]+)/g)) {
        const p = m[1]!;
        // node_modules appears after npm ci; scripts/ must be in the repo.
        if (p.startsWith("scripts/") && !existsSync(join(ROOT, p))) missing.push(p);
      }
    }
    assert.deepEqual(missing, []);
  });

  it("swallows no failure with || true", () => {
    assert.deepEqual(
      lines.filter((l) => /\|\|\s*true/.test(l)),
      [],
    );
  });

  it("binds only 127.0.0.1", () => {
    assert.match(text, /--host 127\.0\.0\.1/);
    assert.doesNotMatch(text, /0\.0\.0\.0/);
  });

  it("the binary it starts is the one npm ci installs", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    assert.ok(pkg.devDependencies.vite, "vite is a dev dependency");
    assert.match(text, /node_modules\/\.bin\/vite dev/);
  });
});
