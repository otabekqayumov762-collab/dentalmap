import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ViewId } from "../types";
import { Button, Field, PhoneField, useToast } from "../ui";

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
