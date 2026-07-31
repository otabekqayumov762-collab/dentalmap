const SESSION_PII_KEYS = [
  "dental-map-user-profile",
  "dentalmap_login_draft",
  "dentalmap_appointment_draft",
  "dentalmap_local_account",
  "dentalmap_local_appointments",
  "dentalmap_local_reviews"
] as const;

const RETIRED_KEYS = ["dentalmap_appointment_leads", "dentalmap_telegram_init_data"] as const;

/**
 * One-time privacy migration: older builds kept profile/medical demo data in
 * persistent localStorage. Keep it only for the current tab session and remove
 * retired lead/initData caches entirely.
 */
export function migrateSensitiveStorage() {
  // Delete signed Telegram data and retired lead caches first. Each storage
  // operation is isolated so one denied/full storage backend cannot leave the
  // remaining persistent PII behind.
  for (const key of RETIRED_KEYS) {
    removeStorageKey("localStorage", key);
    removeStorageKey("sessionStorage", key);
  }

  for (const key of SESSION_PII_KEYS) {
    let legacyValue: string | null = null;
    try {
      legacyValue = window.localStorage.getItem(key);
    } catch {
      // Continue to the best-effort removal below.
    }

    if (legacyValue !== null) {
      try {
        if (window.sessionStorage.getItem(key) === null) {
          window.sessionStorage.setItem(key, legacyValue);
        }
      } catch {
        // Persistence is the privacy boundary; migration to session storage is
        // optional when the embedded browser denies writes or its quota is full.
      }
    }
    removeStorageKey("localStorage", key);
  }
}

export function clearSensitiveStorage() {
  for (const key of [...SESSION_PII_KEYS, ...RETIRED_KEYS]) {
    removeStorageKey("sessionStorage", key);
    removeStorageKey("localStorage", key);
  }
}

function removeStorageKey(storageName: "localStorage" | "sessionStorage", key: string) {
  try {
    window[storageName].removeItem(key);
  } catch {
    // Embedded/private browsers may deny individual storage operations. Keep
    // processing every other sensitive key rather than aborting the cleanup.
  }
}
