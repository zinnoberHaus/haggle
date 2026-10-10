import test from "node:test";
import assert from "node:assert/strict";
import { matchQuery, money } from "../src/lib/format";
test("budget-only queries do not treat the amount as a keyword", () => {
  assert.equal(matchQuery("Wireless headphones", "under $100"), true);
  assert.equal(matchQuery("Wireless headphones", "under $1,000"), true);
  assert.equal(
    matchQuery("Wireless headphones", "headphones under $100"),
    true,
  );
  assert.equal(matchQuery("Garden chair", "headphones under $100"), false);
});
test("unmatched shopping queries stay unmatched", () => {
  assert.equal(matchQuery("Wireless headphones", "folding bicycle"), false);
  assert.equal(matchQuery("Ninja blender", "blender"), true);
});
test("unknown prices do not become free", () => {
  assert.equal(money(null), "See offer");
  assert.equal(money(0), "$0");
  assert.equal(money(2999), "$29.99");
});
