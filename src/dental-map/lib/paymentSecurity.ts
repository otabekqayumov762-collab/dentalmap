/**
 * Payme checkout guard. The backend returns a hosted checkout URL and the app
 * navigates the doctor to it, so an attacker-influenced response must never be
 * able to send them to an arbitrary origin. Only an exact, build-configured
 * Payme host is accepted.
 *
 * The env var is read at CALL time, not at module load: under
 * `node --experimental-strip-types --test` nothing seeds NEXT_PUBLIC_* before the
 * module is imported, so a module-scope read would freeze an empty allowlist and
 * make every test assertion vacuously false.
 */
export function configuredPaymeCheckoutHosts() {
  const configured = process.env.NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS?.trim() || "";
  return new Set(
    configured
      .split(",")
      .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
      .filter(Boolean)
  );
}

/** Accept only an exact, build-configured Payme host. Subdomains, credentials,
 *  non-standard ports and lookalike suffixes are rejected. */
export function isAllowedPaymeCheckoutUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      configuredPaymeCheckoutHosts().has(host)
    );
  } catch {
    return false;
  }
}

/** The server is the price authority; the client must refuse a mismatch rather
 *  than send the doctor to a checkout for an amount it never showed them. */
export function paymeAmountMatches(returned: unknown, expectedUzs: number | null) {
  if (expectedUzs === null || !Number.isFinite(expectedUzs)) {
    return false;
  }
  const value = typeof returned === "string" ? Number(returned) : returned;
  return typeof value === "number" && Number.isFinite(value) && Number(value) === Number(expectedUzs);
}
