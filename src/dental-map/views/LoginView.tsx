import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { BrandLogo } from "../components/common";
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
    <div className="flex flex-col gap-6 pt-2">
      <header className="flex flex-col items-center gap-3 pt-4 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50">
          <BrandLogo />
        </span>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">Tizimga kirish</h1>
          <p className="mt-1 text-sm text-ink-500">Login va parolingiz bilan kiring</p>
        </div>
      </header>

      <form className="flex flex-col gap-4 rounded-card bg-surface-0 p-5 shadow-card" onSubmit={handleSubmit}>
        <Field label="Login" name="login" autoComplete="username" placeholder="Login" />
        <Field label="Parol" name="password" type="password" autoComplete="current-password" placeholder="••••••••" />

        {error && (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-danger" role="alert">
            {error}
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
