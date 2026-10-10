import assert from "node:assert/strict";
import test from "node:test";
import { shortDate } from "../src/lib/format";

test("calendar purchase dates do not shift to the previous day", () => {
  assert.equal(shortDate("2026-01-10"), "Jan 10");
  assert.equal(shortDate("2026-07-10"), "Jul 10");
  assert.equal(shortDate("2026-01-10T00:30:00Z"), "Jan 9");
});
