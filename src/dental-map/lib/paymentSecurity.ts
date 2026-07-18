const configuredHosts = process.env.NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS?.trim() || "";

export function configuredPaymeCheckoutHosts() {
  return new Set(
    configuredHosts
      .split(",")
      .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
      .filter(Boolean)
  );
}

/** Accept only an exact, build-configured Payme host. Subdomains, credentials,
 * non-standard ports and lookalike suffixes are rejected. */
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
