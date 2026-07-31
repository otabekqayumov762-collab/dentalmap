import type { ApiUser } from "../types";

const LOCAL_ACCOUNT_KEY = "dentalmap_local_account";

/** Persists a locally-created account for this tab session (demo/no-backend mode). */
export function saveLocalAccount(user: ApiUser) {
  try {
    window.sessionStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(user));
  } catch {
    // Storage may be unavailable; the account still works for this session.
  }
}

export function getLocalAccount(): ApiUser | null {
  try {
    const raw = window.sessionStorage.getItem(LOCAL_ACCOUNT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const candidate = parsed as Partial<ApiUser>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.full_name !== "string" ||
      typeof candidate.phone !== "string" ||
      (candidate.role !== "user" && candidate.role !== "doctor")
    ) {
      return null;
    }
    return candidate as ApiUser;
  } catch {
    return null;
  }
}

export function clearLocalAccount() {
  try {
    window.sessionStorage.removeItem(LOCAL_ACCOUNT_KEY);
    window.localStorage.removeItem(LOCAL_ACCOUNT_KEY);
  } catch {
    // ignore
  }
}

/** Builds a local ApiUser from a registration FormData payload. */
export function buildLocalAccount(formData: FormData, role: "user" | "doctor"): ApiUser {
  const fullName = String(formData.get("full_name") || "").trim() || (role === "doctor" ? "Shifokor" : "Foydalanuvchi");
  const phone = String(formData.get("doctor_phone") || formData.get("phone") || "").trim();
  return {
    id: `local-${Date.now()}`,
    full_name: fullName,
    phone,
    role,
    doctor_profile:
      role === "doctor"
        ? {
            id: `local-doc-${Date.now()}`,
            approval_status: "approved",
            is_published: true,
            subscription_expires_at: null,
            is_subscription_active: true
          }
        : null
  };
}
