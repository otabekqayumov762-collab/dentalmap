import { useState, type FormEvent } from "react";
import { isOfflineMode } from "../api/dentalMapApi";
import type { OtpIssue } from "../hooks/useDentalData";
import type { RegisterRole, Service, Specialty } from "../types";
// The doctor wizard is code-split (see lazyViews.tsx): the patient form is the
// default path and the one the e2e drives, and it must not pay for the map
// picker and the region sheet it never renders. The OTP pane is no longer on
// that list — patients verify their phone too, so those boxes are theirs now.
import { DoctorRegistrationForm, prefetchDoctorRegistrationForm } from "./lazyViews";
import { RegisterRoleToggle } from "./register/RegisterRoleToggle";
import { UserRegistrationForm } from "./register/UserRegistrationForm";

export function RegisterView({
  role,
  specialties,
  services,
  taxonomyLoading,
  taxonomyError,
  onRetryTaxonomies,
  userRegistered,
  submitting,
  doctorStep,
  onDoctorStepChange,
  onPatientStepChange,
  onRoleChange,
  onRequestOtp,
  onVerifyOtp,
  onOtpTokenChange,
  onUserSubmit,
  onDoctorSubmit
}: {
  role: RegisterRole;
  specialties: Specialty[];
  services: Service[];
  taxonomyLoading?: boolean;
  taxonomyError?: string;
  onRetryTaxonomies?: () => void;
  userRegistered: boolean;
  submitting: boolean;
  doctorStep: number;
  onDoctorStepChange: (step: number) => void;
  onPatientStepChange: (step: number) => void;
  onRoleChange: (role: RegisterRole) => void;
  onRequestOtp: (phone: string) => Promise<OtpIssue>;
  onVerifyOtp: (phone: string, code: string) => Promise<string>;
  onOtpTokenChange: (token: string | null) => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [patientStep, setPatientStep] = useState(1);
  const activeStep = role === "doctor" ? doctorStep : patientStep;
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() =>
    isOfflineMode() ? ["consultation"] : []
  );
  const [photoFileName, setPhotoFileName] = useState("");
  const [userGender, setUserGender] = useState("");
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
    <div className="flex flex-col gap-6">
      {/* Also a chooser, and it lives here rather than in AuthGate — so it
          survived the header collapse and sat alone above the form, still
          offering a switch that would discard everything typed. */}
      {!userRegistered && activeStep <= 1 && (
        <RegisterRoleToggle
          role={role}
          onRoleChange={onRoleChange}
          onRolePrefetch={(next) => {
            if (next === "doctor") {
              prefetchDoctorRegistrationForm();
            }
          }}
        />
      )}

      {role === "user" ? (
        <UserRegistrationForm
          onStepChange={(next) => {
            setPatientStep(next);
            onPatientStepChange(next);
          }}
          userGender={userGender}
          userRegistered={userRegistered}
          submitting={submitting}
          onGenderChange={setUserGender}
          onRequestOtp={onRequestOtp}
          onVerifyOtp={onVerifyOtp}
          onOtpTokenChange={onOtpTokenChange}
          onSubmit={onUserSubmit}
        />
      ) : (
        <DoctorRegistrationForm
          step={doctorStep}
          submitting={submitting}
          specialties={specialties}
          services={services}
          taxonomyLoading={taxonomyLoading}
          taxonomyError={taxonomyError}
          onRetryTaxonomies={onRetryTaxonomies}
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
          onSetServices={setSelectedServiceIds}
          onPhotoFileChange={setPhotoFileName}
          onRequestOtp={onRequestOtp}
          onVerifyOtp={onVerifyOtp}
          onOtpTokenChange={onOtpTokenChange}
          onSubmit={onDoctorSubmit}
        />
      )}
    </div>
  );
}
