import { useState, type FormEvent } from "react";
import type { RegisterRole, ViewId } from "../types";
import { Button } from "../ui";
import { DoctorRegistrationForm } from "./register/DoctorRegistrationForm";
import { DoctorPaymentView } from "./payment/DoctorPaymentView";
import { RegisterRoleToggle } from "./register/RegisterRoleToggle";
import { UserRegistrationForm } from "./register/UserRegistrationForm";

export function RegisterView({
  role,
  userRegistered,
  doctorRegistrationSent,
  doctorSubscriptionPaid,
  registrationError,
  onRoleChange,
  onUserSubmit,
  onDoctorSubmit,
  onDoctorPaid,
  onNavigate
}: {
  role: RegisterRole;
  userRegistered: boolean;
  doctorRegistrationSent: boolean;
  doctorSubscriptionPaid: boolean;
  registrationError: string;
  onRoleChange: (role: RegisterRole) => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorPaid: () => void;
  onNavigate: (view: ViewId) => void;
}) {
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

          {doctorRegistrationSent && (
            <DoctorPaymentView paid={doctorSubscriptionPaid} onPaid={onDoctorPaid} />
          )}
        </>
      )}

      <Button variant="secondary" size="lg" type="button" onClick={() => onNavigate("profile")}>
        Profilga qaytish
      </Button>
    </div>
  );
}
