import { useState, type FormEvent } from "react";
import type { RegisterRole, Service, Specialty } from "../types";
import { DoctorRegistrationForm } from "./register/DoctorRegistrationForm";
import { RegisterRoleToggle } from "./register/RegisterRoleToggle";
import { UserRegistrationForm } from "./register/UserRegistrationForm";

export function RegisterView({
  role,
  specialties,
  services,
  userRegistered,
  submitting,
  doctorStep,
  onDoctorStepChange,
  onRoleChange,
  onUserSubmit,
  onDoctorSubmit
}: {
  role: RegisterRole;
  specialties: Specialty[];
  services: Service[];
  userRegistered: boolean;
  submitting: boolean;
  doctorStep: number;
  onDoctorStepChange: (step: number) => void;
  onRoleChange: (role: RegisterRole) => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
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
      {!userRegistered && <RegisterRoleToggle role={role} onRoleChange={onRoleChange} />}

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
        <DoctorRegistrationForm
          step={doctorStep}
          submitting={submitting}
          specialties={specialties}
          services={services}
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
    </div>
  );
}
