import type { ApiUser } from "../types";

const AUTH_STORAGE_KEY = "dentalmap_auth_tokens";

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
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authTokens));
  } catch {
    // Auth still works for the current session.
  }
}

export function getAccessToken() {
  return authTokens.access || "";
}

export function restoreAuthTokens() {
  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
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
