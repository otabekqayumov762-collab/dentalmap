/**
 * The weekday mapping, which is the part of this feature that can be wrong
 * without looking wrong.
 *
 * The API numbers Monday as 0; the browser's Date numbers Sunday as 0. Getting
 * that backwards books patients one day off for six days of the week and sends
 * Sunday's to Monday, and nothing on screen says so. So it is asserted by NAME
 * here, not by number alone -- a test that only checked `api === 0` would pass
 * just as happily against Sunday.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { WORK_DAYS, WORK_DAY_PRESETS, serializeWorkDays } from "../src/dental-map/lib/workDays.ts";

test("zero is Monday and six is Sunday, the way the API counts", () => {
  const byApi = new Map(WORK_DAYS.map((d) => [d.api, d.full]));

  assert.equal(byApi.get(0), "Dushanba");
  assert.equal(byApi.get(4), "Juma");
  assert.equal(byApi.get(5), "Shanba");
  assert.equal(byApi.get(6), "Yakshanba");
});

test("the week is seven days, each numbered once", () => {
  assert.equal(WORK_DAYS.length, 7);
  assert.deepEqual(
    WORK_DAYS.map((d) => d.api),
    [0, 1, 2, 3, 4, 5, 6]
  );
});

test("this is NOT the browser's numbering", () => {
  // Date.getDay() would put Sunday at 0. If someone ever "fixes" this file to
  // match the browser, this is the test that objects.
  const sunday = WORK_DAYS.find((d) => d.full === "Yakshanba");
  assert.notEqual(sunday.api, 0);
  assert.equal(sunday.api, 6);
});

test("every day has a short label that fits a seventh of a phone", () => {
  for (const day of WORK_DAYS) {
    assert.ok(day.short.length <= 2, `${day.full} -> ${day.short}`);
  }
});

test("the presets are working weeks, not arbitrary sets", () => {
  const [monFri, monSat] = WORK_DAY_PRESETS;

  assert.deepEqual([...monFri.days], [0, 1, 2, 3, 4]);
  assert.deepEqual([...monSat.days], [0, 1, 2, 3, 4, 5]);
  // Neither preset may include Sunday: a preset is a shortcut, and a shortcut
  // that quietly adds a rest day is worse than no shortcut.
  for (const preset of WORK_DAY_PRESETS) {
    assert.ok(!preset.days.includes(6), preset.label);
  }
});

test("what the form posts is sorted and deduplicated", () => {
  // Two identical days would become two windows and collide with the model's
  // unique constraint -- which the doctor reads as "registration failed".
  assert.equal(serializeWorkDays([4, 0, 4, 2]), "0,2,4");
  assert.equal(serializeWorkDays([]), "");
  assert.equal(serializeWorkDays([6]), "6");
});
