import assert from "node:assert/strict";
import { parseEventUpdate } from "../src/lib/event-update";

const a = parseEventUpdate("Dates moved to 18 to 21 Dec 2027, footfall 1.5 lakh, goal ₹80 lakh");
assert.equal(a.dates, "18 to 21 Dec 2027"); assert.equal(a.reach, 150000); assert.equal(a.goal_inr, 8000000);
const b = parseEventUpdate("Past sponsors: Jio, L&T and NPCI\nBrands we want: Red Bull, boAt");
assert.deepEqual(b.past, ["Jio", "L&T", "NPCI"]); assert.deepEqual(b.brands, ["Red Bull", "boAt"]);
const c = parseEventUpdate("Address is IIT Bombay, Powai, Mumbai 400076");
assert.equal(c.postal_address, "IIT Bombay, Powai, Mumbai 400076");
const d = parseEventUpdate("We have a robotics expo with 60 teams");
assert.equal(d.notes.length, 1); assert.equal(d.reach, undefined);
const e = parseEventUpdate("50,000 attendees. Venue moved to Pune");
assert.equal(e.reach, 50000); assert.equal(e.city, "Pune");
console.log("event-update: all passed");
