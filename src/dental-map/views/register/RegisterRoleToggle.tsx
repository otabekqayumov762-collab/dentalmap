import { Stethoscope, User } from "lucide-react";
import type { RegisterRole } from "../../types";

export function RegisterRoleToggle({
  role,
  onRoleChange
}: {
  role: RegisterRole;
  onRoleChange: (role: RegisterRole) => void;
}) {
  return (
    <div className="role-toggle" aria-label="Rol tanlash">
      <button
        className={role === "user" ? "role-option active" : "role-option"}
        type="button"
        onClick={() => onRoleChange("user")}
      >
        <User size={20} />
        <span>
          <strong>Foydalanuvchi</strong>
          <small>Qabulga yozilish va konsultatsiya olish</small>
        </span>
      </button>
      <button
        className={role === "doctor" ? "role-option active" : "role-option"}
        type="button"
        onClick={() => onRoleChange("doctor")}
      >
        <Stethoscope size={20} />
        <span>
          <strong>Shifokor</strong>
          <small>Anketa, klinika va obuna to&apos;lovi</small>
        </span>
      </button>
    </div>
  );
}
