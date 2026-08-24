import type { ApiUser } from "../types";
import type { AuthPayload } from "./tokenStore";

/**
 * The one place that decides whether an auth response is a session.
 *
 * Three endpoints return the same envelope -- `/api/auth/token/`,
 * `/api/auth/telegram/` and the password-reset confirm -- and each used to check
 * it inline. All three demanded `typeof user.id === "string"`.
 *
 * The API has never sent one. `User` has no custom primary key, so `id` is
 * Django's default integer AutoField and every response carries `"id": 47`.
 * Measured against production: every user in the database serialises to an int.
 * (`doctor_profile.id` is wrapped in `str()` by hand a few lines away in the same
 * serializer, which is presumably where the assumption came from.)
 *
 * So a correct password returned HTTP 200 and the client threw the session away,
 * showing "Kirish serveridan noto'g'ri javob olindi" -- indistinguishable, to the
 * person typing, from a wrong password. Someone who reset their password could
 * complete the reset and still not get in. Telegram auth failed the same check
 * and only looked healthy because it falls back to a previously stored session.
 *
 * The e2e suite did not catch it: its fixtures use `id: "patient-1"`, a string,
 * so the tests asserted a contract the server does not implement.
 *
 * The id is normalised to a string on the way through, so everything downstream
 * keeps the single `ApiUser["id"]: string` type it is written against.
 */
export function normalizeAuthPayload(payload: unknown): { user: ApiUser; tokens: { access: string } } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidate = payload as AuthPayload;
  const user = candidate.user;
  if (!user || typeof user !== "object") {
    return null;
  }

  const access = candidate.tokens?.access;
  if (typeof access !== "string" || !access) {
    return null;
  }

  // Numbers and strings only, and neither may be empty. Loosening this for the
  // integer the server sends must not loosen it for a truncated or wrong-shaped
  // response -- that is what the check is for. `true` is excluded deliberately:
  // typeof would let a boolean through any looser test, and NaN is not an id.
  const rawId: unknown = (user as { id?: unknown }).id;
  let id: string;
  if (typeof rawId === "string") {
    if (!rawId) {
      return null;
    }
    id = rawId;
  } else if (typeof rawId === "number" && Number.isFinite(rawId)) {
    id = String(rawId);
  } else {
    return null;
  }

  return { user: { ...user, id }, tokens: { access } };
}
