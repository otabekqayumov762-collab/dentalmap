import type { ApiUser } from "../types";

/** Telegram auth may provision a minimal patient shell before role selection. */
export function isTelegramPlaceholderUser(user?: ApiUser | null) {
  const phone = String(user?.phone ?? "").trim();
  const match = /^tg:(\d+)$/.exec(phone);
  if (!match) {
    return false;
  }
  const placeholderTelegramId = Number(match[1]);
  // The placeholder phone itself is the server-issued marker. Treat even an
  // inconsistent telegram_id as incomplete so corrupt state cannot bypass the
  // onboarding wall.
  return Number.isSafeInteger(placeholderTelegramId) && placeholderTelegramId > 0;
}

/** Placeholder upgrades are safe only when the backend can verify fresh initData. */
export function requireTelegramOnboardingInitData(user: ApiUser | null, initData: string) {
  if (isTelegramPlaceholderUser(user) && !initData.trim()) {
    throw new Error("Telegram sessiyasi topilmadi. Botni yopib, qayta oching.");
  }
}
