import assert from "node:assert/strict";
import { floorFor, ladder, retitle } from "../src/lib/agents";

// A budget sizes the ladder: 1 Title + 2 Platinum + 4 Gold + 6 Silver = 3.6 x Title reaches the goal.
assert.equal(retitle(7500000, 175000, 175000, 3600000), 1000000);
// A smaller event scales the Title down with the audience.
assert.equal(retitle(1000000, 10000, 2000, 0), 200000);
// Never below the floor of ₹1 lakh for Title.
assert.equal(retitle(200000, 2000, 100, 0), 100000);
const t = ladder(1000000);
assert.deepEqual(t.map((x) => x.price_inr), [1000000, 500000, 250000, 100000]);
assert.equal(floorFor(t), 80000);
console.log("pricing: all passed");
