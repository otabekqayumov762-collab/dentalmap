import type { ApiUser } from "../types";

const AUTH_STORAGE_KEY = "dentalmap_auth_tokens";
const LEGACY_AUTH_STORAGE_KEY = AUTH_STORAGE_KEY;

export type AuthPayload = {
  user?: ApiUser;
  tokens?: {
    access?: string;
    refresh?: string;
  };
};

let authTokens: NonNullable<AuthPayload["tokens"]> = {};

export function storeAuthTokens(payload: AuthPayload) {
  authTokens = {
    access: payload.tokens?.access,
    refresh: payload.tokens?.refresh
  };
  try {
    if (authTokens.access || authTokens.refresh) {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authTokens));
    } else {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    }
  } catch {
    // Auth still works for the current session.
  }
}

export function getAccessToken() {
  return authTokens.access || "";
}

export function getRefreshToken() {
  return authTokens.refresh || "";
}

export function restoreAuthTokens() {
  try {
    const rawValue = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      return "";
    }
    const parsedValue = JSON.parse(rawValue) as NonNullable<AuthPayload["tokens"]>;
    authTokens = {
      access: typeof parsedValue.access === "string" ? parsedValue.access : "",
      refresh: typeof parsedValue.refresh === "string" ? parsedValue.refresh : ""
    };
    return authTokens.access || "";
  } catch {
    return "";
  }
}
