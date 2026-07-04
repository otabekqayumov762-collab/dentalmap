import { useState, type FormEvent } from "react";
import type { RegisterRole, ViewId } from "../types";
import { Button } from "../ui";
import { DoctorRegistrationForm } from "./register/DoctorRegistrationForm";
import { DoctorPendingApprovalView } from "./DoctorPendingApprovalView";
import { RegisterRoleToggle } from "./register/RegisterRoleToggle";
import { UserRegistrationForm } from "./register/UserRegistrationForm";

export function RegisterView({
  role,
  userRegistered,
  doctorRegistrationSent,
  doctorSubscriptionPaid,
  submitting,
  doctorStep,
  onDoctorStepChange,
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
  submitting: boolean;
  doctorStep: number;
  onDoctorStepChange: (step: number) => void;
  onRoleChange: (role: RegisterRole) => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorPaid: () => void;
  onNavigate: (view: ViewId) => void;
}) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(["consultation"]);
  const [photoFileName, setPhotoFileName] = useState("");
  const [userGender, setUserGender] = useState("");
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [userDistrict, setUserDistrict] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [doctorGender, setDoctorGender] = useState("");
  const [doctorRegion, setDoctorRegion] = useState<string | null>(null);
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
      {!userRegistered && !doctorRegistrationSent && (
        <RegisterRoleToggle role={role} onRoleChange={onRoleChange} />
      )}

      {role === "user" ? (
        <UserRegistrationForm
          userGender={userGender}
          userRegion={userRegion}
          userDistrict={userDistrict}
          userRegistered={userRegistered}
          submitting={submitting}
          onGenderChange={setUserGender}
          onRegionChange={setUserRegion}
          onDistrictChange={setUserDistrict}
          onSubmit={onUserSubmit}
        />
      ) : (
        <>
          {!doctorRegistrationSent && (
            <DoctorRegistrationForm
              step={doctorStep}
              submitting={submitting}
              doctorSpecialty={doctorSpecialty}
              doctorGender={doctorGender}
              doctorRegion={doctorRegion}
              doctorDistrict={doctorDistrict}
              selectedServiceIds={selectedServiceIds}
              photoFileName={photoFileName}
              onStepChange={onDoctorStepChange}
              onSpecialtyChange={setDoctorSpecialty}
              onDoctorGenderChange={setDoctorGender}
              onRegionChange={setDoctorRegion}
              onDistrictChange={setDoctorDistrict}
              onToggleService={toggleService}
              onPhotoFileChange={setPhotoFileName}
              onSubmit={onDoctorSubmit}
            />
          )}

          {doctorRegistrationSent && <DoctorPendingApprovalView />}
        </>
      )}

      <Button
        variant="secondary"
        size="lg"
        type="button"
        disabled={submitting}
        onClick={() => onNavigate("profile")}
      >
        Kirishga qaytish
      </Button>
    </div>
  );
}
