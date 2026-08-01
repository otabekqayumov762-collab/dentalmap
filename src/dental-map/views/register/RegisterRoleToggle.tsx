import { Stethoscope, User } from "lucide-react";
import type { RegisterRole } from "../../types";
import { SegmentedToggle, type SegmentedOption } from "../../ui";

const roleOptions: Array<SegmentedOption<RegisterRole>> = [
  { value: "user", label: "Mijoz", Icon: User },
  { value: "doctor", label: "Shifokor", Icon: Stethoscope }
];

// The per-tile subtitles lived inside the buttons, which is what forced them to
// 86px. Only the selected one is ever useful, so it moves under the control as a
// single swapping line and the toggle itself stays one row.
const roleSummary: Record<RegisterRole, string> = {
  user: "Qabulga yozilish va shifokor tanlash",
  doctor: "Klinika profili va bemorlar oqimi"
};

export function RegisterRoleToggle({
  role,
  onRoleChange,
  onRolePrefetch
}: {
  role: RegisterRole;
  onRoleChange: (role: RegisterRole) => void;
  /** Pointer-DOWN hook: the doctor wizard chunk starts downloading on touch, so
   *  it is already cached by the time the tap is released. */
  onRolePrefetch?: (role: RegisterRole) => void;
}) {
  return (
    <div>
      <SegmentedToggle
        value={role}
        options={roleOptions}
        onChange={onRoleChange}
        onOptionPointerDown={onRolePrefetch}
        ariaLabel="Rol tanlash"
      />
      <p className="mt-2 text-center text-xs font-medium text-ink-400">{roleSummary[role]}</p>
    </div>
  );
}
