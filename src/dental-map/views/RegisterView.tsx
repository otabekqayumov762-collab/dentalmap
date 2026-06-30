import { Clock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { paymentMethods } from "../catalog";
import type { RegisterRole, ViewId } from "../types";
import { Button } from "../ui";
import { DoctorRegistrationForm } from "./register/DoctorRegistrationForm";
import { DoctorSubscriptionFlow } from "./register/DoctorSubscriptionFlow";
import { RegisterRoleToggle } from "./register/RegisterRoleToggle";
import { UserRegistrationForm } from "./register/UserRegistrationForm";

export function RegisterView({
  role,
  userRegistered,
  doctorRegistrationSent,
  doctorSubscriptionPaid,
  paymentSubmitting,
  registrationError,
  onRoleChange,
  onUserSubmit,
  onDoctorSubmit,
  onDoctorPay,
  onNavigate
}: {
  role: RegisterRole;
  userRegistered: boolean;
  doctorRegistrationSent: boolean;
  doctorSubscriptionPaid: boolean;
  paymentSubmitting: boolean;
  registrationError: string;
  onRoleChange: (role: RegisterRole) => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorPay: (event: FormEvent<HTMLFormElement>) => void;
  onNavigate: (view: ViewId) => void;
}) {
  const [method, setMethod] = useState<(typeof paymentMethods)[number][0]>("click");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(["consultation"]);
  const [photoFileName, setPhotoFileName] = useState("");
  const [userGender, setUserGender] = useState("");
  const [userDistrict, setUserDistrict] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [doctorDistrict, setDoctorDistrict] = useState("");

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RegisterRoleToggle role={role} onRoleChange={onRoleChange} />

      {role === "user" ? (
        <UserRegistrationForm
          userGender={userGender}
          userDistrict={userDistrict}
          userRegistered={userRegistered}
          registrationError={registrationError}
          onGenderChange={setUserGender}
          onDistrictChange={setUserDistrict}
          onSubmit={onUserSubmit}
        />
      ) : (
        <>
          {!doctorRegistrationSent && (
            <DoctorRegistrationForm
              doctorSpecialty={doctorSpecialty}
              doctorDistrict={doctorDistrict}
              selectedServiceIds={selectedServiceIds}
              photoFileName={photoFileName}
              registrationError={registrationError}
              onSpecialtyChange={setDoctorSpecialty}
              onDistrictChange={setDoctorDistrict}
              onToggleService={toggleService}
              onPhotoFileChange={setPhotoFileName}
              onSubmit={onDoctorSubmit}
            />
          )}

          {doctorRegistrationSent ? (
            <DoctorSubscriptionFlow
              method={method}
              doctorSubscriptionPaid={doctorSubscriptionPaid}
              paymentSubmitting={paymentSubmitting}
              paymentError={registrationError}
              onMethodChange={setMethod}
              onDoctorPay={onDoctorPay}
            />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-surface-50 px-4 py-3.5">
              <Clock size={18} className="shrink-0 text-ink-400" />
              <span>
                <strong className="block text-sm font-semibold text-ink-900">
                  To&apos;lov keyingi bosqichda
                </strong>
                <small className="block text-xs text-ink-500">
                  Avval shifokor ma&apos;lumotlarini to&apos;liq yuboring.
                </small>
              </span>
            </div>
          )}
        </>
      )}

      <Button variant="secondary" size="lg" type="button" onClick={() => onNavigate("profile")}>
        Profilga qaytish
      </Button>
    </div>
  );
}
