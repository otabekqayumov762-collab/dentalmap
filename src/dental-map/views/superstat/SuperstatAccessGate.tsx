"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "../../api/dentalMapApi";
import { getAccessToken, restoreAuthTokens } from "../../lib/tokenStore";
import type { ApiUser } from "../../types";
import { Badge, Card } from "../../ui";

type GateStatus = "checking" | "authorized" | "denied";

/**
 * SUPERSTAT shows live revenue and payer PII, so it must never render for an
 * unauthenticated visitor or a non-admin user. Reuses the existing token
 * store + `/api/users/me/` role check — no new auth mechanism.
 */
export function SuperstatAccessGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GateStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const token = getAccessToken() || restoreAuthTokens();
      if (!token) {
        if (!cancelled) {
          setStatus("denied");
        }
        return;
      }

      try {
        const me = await apiRequest<ApiUser>("/api/users/me/", { token });
        if (!cancelled) {
          setStatus(me.role === "admin" ? "authorized" : "denied");
        }
      } catch {
        if (!cancelled) {
          setStatus("denied");
        }
      }
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-6">
        <p className="text-sm text-ink-500">Ruxsat tekshirilmoqda…</p>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-6">
        <Card className="flex max-w-sm flex-col items-center gap-3 p-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <ShieldAlert size={22} />
          </span>
          <Badge tone="danger">Ruxsat yo&apos;q</Badge>
          <p className="text-sm leading-relaxed text-ink-500">
            Bu sahifani ko&apos;rish uchun administrator sifatida kiring.
          </p>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
