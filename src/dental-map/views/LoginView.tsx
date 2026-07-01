import { LogIn, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ViewId } from "../types";
import { Button, Field } from "../ui";

export function LoginView({
  onLogin,
  onNavigate
}: {
  onLogin: (login: string, password: string) => Promise<string>;
  onNavigate: (view: ViewId) => void;
}) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const login = String(formData.get("login") || "").trim();
    const password = String(formData.get("password") || "");

    if (!login || !password) {
      setError("Login va parolni kiriting.");
      return;
    }

    setSubmitting(true);
    setError("");
    const message = await onLogin(login, password);
    setSubmitting(false);
    if (message) {
      setError(message);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form className="flex flex-col gap-4 rounded-card bg-surface-0 p-5 shadow-card" onSubmit={handleSubmit}>
        <Field label="Login" name="login" autoComplete="username" placeholder="Login" />
        <Field label="Parol" name="password" type="password" autoComplete="current-password" placeholder="••••••••" />

        {error && (
          <div
            className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-danger"
            role="alert"
          >
            <XCircle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" disabled={submitting}>
          <LogIn size={18} />
          {submitting ? "Kirilmoqda..." : "Kirish"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-500">
        Hisobingiz yo&apos;qmi?{" "}
        <button type="button" className="font-semibold text-brand-600" onClick={() => onNavigate("register")}>
          Ro&apos;yxatdan o&apos;tish
        </button>
      </p>
    </div>
  );
}
