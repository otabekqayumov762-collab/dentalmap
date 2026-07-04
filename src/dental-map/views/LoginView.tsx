import { LogIn } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { ViewId } from "../types";
import { Button, Field, PhoneField, useToast } from "../ui";

// Draft key so the login inputs survive a Telegram mini-app reload. Kept in
// sessionStorage (per-tab, cleared on close) and wiped on a successful login.
const loginDraftKey = "dentalmap_login_draft";

function readLoginDraft(): { phone: string; password: string } {
  try {
    const raw = window.sessionStorage.getItem(loginDraftKey);
    const parsed = raw ? (JSON.parse(raw) as { phone?: string; password?: string }) : {};
    return { phone: parsed.phone || "", password: parsed.password || "" };
  } catch {
    return { phone: "", password: "" };
  }
}

function writeLoginDraft(phone: string, password: string) {
  try {
    if (phone || password) {
      window.sessionStorage.setItem(loginDraftKey, JSON.stringify({ phone, password }));
    } else {
      window.sessionStorage.removeItem(loginDraftKey);
    }
  } catch {
    // sessionStorage can be unavailable in some embedded browsers — draft is optional.
  }
}

export function LoginView({
  onLogin,
  onNavigate
}: {
  onLogin: (login: string, password: string) => Promise<string>;
  onNavigate: (view: ViewId) => void;
}) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [invalidField, setInvalidField] = useState<"phone" | "password" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Restore any draft left before a reload (client-only; empty on first ever load).
  // Saving happens in the change handlers, NOT an effect, so the initial empty
  // render can never clobber the restored draft.
  useEffect(() => {
    const draft = readLoginDraft();
    if (draft.phone) {
      setPhone(draft.phone);
    }
    if (draft.password) {
      setPassword(draft.password);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phone.trim()) {
      setInvalidField("phone");
      toast.error("Telefon va parolni kiriting.");
      return;
    }
    if (!password) {
      setInvalidField("password");
      toast.error("Telefon va parolni kiriting.");
      return;
    }
    setInvalidField(null);
    setSubmitting(true);
    const message = await onLogin(phone, password);
    setSubmitting(false);
    if (message) {
      toast.error(message);
    } else {
      writeLoginDraft("", "");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form className="flex flex-col gap-4 rounded-card bg-surface-0 p-5 shadow-card" onSubmit={handleSubmit}>
        <PhoneField
          label="Telefon raqam"
          name="phone"
          value={phone}
          error={invalidField === "phone"}
          onValueChange={(value) => {
            setPhone(value);
            writeLoginDraft(value, password);
            setInvalidField((current) => (current === "phone" ? null : current));
          }}
        />
        <Field
          label="Parol"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          error={invalidField === "password"}
          onChange={(event) => {
            setPassword(event.target.value);
            writeLoginDraft(phone, event.target.value);
            setInvalidField((current) => (current === "password" ? null : current));
          }}
        />

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
