import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAuthPayload } from "../src/dental-map/lib/authPayload.ts";

const access = "header.payload.signature";

test("an auth payload is accepted with the id the API actually sends", () => {
  // Django's User has no custom primary key, so `id` is the default integer
  // AutoField and every auth response carries `"id": 47` -- a number. The client
  // required a string and rejected the whole payload, so a CORRECT password
  // produced HTTP 200 and then "Kirish serveridan noto'g'ri javob olindi", with
  // nothing to distinguish it from a wrong password. Measured against production:
  // every user in the database serialises to an int.
  const numeric = normalizeAuthPayload({
    user: { id: 47, full_name: "Sinov", phone: "+998900000001" },
    tokens: { access }
  });
  assert.ok(numeric, "a numeric id is what production sends and must be accepted");
  assert.equal(numeric.user.id, "47");
  assert.equal(typeof numeric.user.id, "string", "normalised so the rest of the app keeps one type");
  assert.equal(numeric.tokens.access, access);

  // A string id still works: the offline/local account path writes one, and so
  // would any future backend that moves to UUIDs.
  const stringy = normalizeAuthPayload({ user: { id: "patient-1" }, tokens: { access } });
  assert.equal(stringy?.user.id, "patient-1");
});

test("an auth payload without a usable identity or token is refused", () => {
  // The check exists to catch a truncated or wrong-shaped response before it is
  // stored as a session. Loosening it for numbers must not loosen it for junk.
  const bad = [
    null,
    {},
    { user: { id: 47 } },
    { user: { id: 47 }, tokens: {} },
    { user: { id: 47 }, tokens: { access: "" } },
    { user: { id: 47 }, tokens: { access: 42 } },
    { tokens: { access } },
    { user: null, tokens: { access } },
    { user: "nope", tokens: { access } },
    { user: { id: null }, tokens: { access } },
    { user: { id: "" }, tokens: { access } },
    { user: { id: {} }, tokens: { access } },
    { user: { id: true }, tokens: { access } },
    { user: { id: Number.NaN }, tokens: { access } }
  ];
  for (const payload of bad) {
    assert.equal(normalizeAuthPayload(payload), null, `should refuse ${JSON.stringify(payload)}`);
  }
});

test("normalising does not discard the rest of the user", () => {
  // The payload is what becomes currentUser, so dropping a field here would show
  // up much later as a missing name or a role the app cannot route on.
  const out = normalizeAuthPayload({
    user: {
      id: 35,
      full_name: "Otabek Qayumov",
      phone: "+998880120211",
      role: "doctor",
      telegram_id: 8756925012,
      is_phone_verified: true
    },
    tokens: { access }
  });
  assert.equal(out.user.full_name, "Otabek Qayumov");
  assert.equal(out.user.role, "doctor");
  assert.equal(out.user.telegram_id, 8756925012, "telegram_id is compared as a number, so it must stay one");
  assert.equal(out.user.is_phone_verified, true);
});
