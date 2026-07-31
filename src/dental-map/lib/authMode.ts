export type AuthTokenMode = "cookie" | "legacy-session";

const configuredMode = process.env.NEXT_PUBLIC_AUTH_TOKEN_MODE?.trim();

/**
 * Cookie mode is the production target: the backend owns a Secure, HttpOnly
 * refresh cookie and JavaScript keeps only the short-lived access token in
 * memory. `legacy-session` exists solely while an older backend still requires
 * the refresh token in a JSON body; it must be selected explicitly at build
 * time and never silently activates itself.
 */
export function getAuthTokenMode(): AuthTokenMode {
  return configuredMode === "legacy-session" ? "legacy-session" : "cookie";
}

export function usesRefreshCookie() {
  return getAuthTokenMode() === "cookie";
}

export function authFetchCredentials(): RequestCredentials {
  return usesRefreshCookie() ? "include" : "omit";
}
