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
let authTokenOwnerTelegramId: number | null = null;

export function storeAuthTokens(payload: AuthPayload) {
  const hasTokens =
    typeof payload.tokens?.access === "string" || typeof payload.tokens?.refresh === "string";
  authTokens = {
    access: typeof payload.tokens?.access === "string" ? payload.tokens.access : "",
    refresh: typeof payload.tokens?.refresh === "string" ? payload.tokens.refresh : ""
  };
  if (payload.user !== undefined) {
    authTokenOwnerTelegramId = normalizeTelegramId(payload.user?.telegram_id);
  } else if (!hasTokens || (!authTokens.access && !authTokens.refresh)) {
    authTokenOwnerTelegramId = null;
  }
  try {
    if (authTokens.access || authTokens.refresh) {
      window.sessionStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ ...authTokens, ownerTelegramId: authTokenOwnerTelegramId })
      );
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
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

export function restoreAuthTokens(expectedTelegramId?: number) {
  try {
    const rawValue = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      return "";
    }
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    const parsedValue = JSON.parse(rawValue) as NonNullable<AuthPayload["tokens"]> & {
      ownerTelegramId?: unknown;
    };
    const storedOwnerTelegramId = normalizeTelegramId(parsedValue.ownerTelegramId);
    if (
      expectedTelegramId !== undefined &&
      normalizeTelegramId(expectedTelegramId) !== storedOwnerTelegramId
    ) {
      throw new Error("Stored auth session belongs to another Telegram user.");
    }
    authTokens = {
      access: typeof parsedValue.access === "string" ? parsedValue.access : "",
      refresh: typeof parsedValue.refresh === "string" ? parsedValue.refresh : ""
    };
    authTokenOwnerTelegramId = storedOwnerTelegramId;
    return authTokens.access || "";
  } catch {
    authTokens = {};
    authTokenOwnerTelegramId = null;
    try {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    } catch {
      // Storage is optional; the in-memory store has still been cleared.
    }
    return "";
  }
}

function normalizeTelegramId(value: unknown): number | null {
  const telegramId = typeof value === "number" ? value : Number.NaN;
  return Number.isSafeInteger(telegramId) && telegramId > 0 ? telegramId : null;
}
