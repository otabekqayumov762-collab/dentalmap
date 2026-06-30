import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ImageUp,
  Loader2,
  RefreshCcw,
  Save,
  Stethoscope,
  XCircle
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { appointmentStatusLabel, weekdayLabel } from "../api/dentalMapApi";
import { districts, specialtyOptions } from "../catalog";
import { DoctorAvatar } from "../components/common";
import type { ApiAppointment, ApiDoctor, ApiUser, ApiWeeklyAvailability } from "../types";
import { Badge, Button, Card, Field, TextareaField } from "../ui";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-700";
const selectClass =
  "w-full rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-ink-900 transition-colors " +
  "focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100";

type AppointmentStatus = ApiAppointment["status"];

function statusTone(status: AppointmentStatus): "brand" | "success" | "warning" | "danger" | "neutral" {
  if (status === "pending") {
    return "warning";
  }
  if (status === "doctor_confirmed") {
    return "brand";
  }
  if (status === "completed") {
    return "success";
  }
  if (status === "doctor_rejected" || status === "user_cancelled" || status === "no_show") {
    return "danger";
  }
  return "neutral";
}

export function DoctorDashboardView({
  user,
  profile,
  appointments,
  schedule,
  loading,
  error,
  onRefresh,
  onProfileSubmit,
  onScheduleSubmit,
  onAppointmentAction
}: {
  user: ApiUser | null;
  profile: ApiDoctor | null;
  appointments: ApiAppointment[];
  schedule: ApiWeeklyAvailability[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onProfileSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onScheduleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAppointmentAction: (appointment: ApiAppointment, action: "confirm" | "reject" | "complete" | "mark_no_show", reason?: string) => Promise<void>;
}) {
  const [photoFileName, setPhotoFileName] = useState("");
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const pendingAppointments = appointments.filter((appointment) => appointment.status === "pending");

  return (
    <div className="flex flex-col gap-4">
      <Card as="section" className="flex items-center gap-3.5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {profile ? (
            <DoctorAvatar
              doctor={{
                id: profile.id,
                name: profile.full_name || user?.full_name || "Doktor",
                specialty: profile.specialty || "Stomatolog",
                rating: Number(profile.rating || 0),
                reviews: profile.reviews_count || 0,
                experience: profile.experience_years ? `${profile.experience_years} yil` : "",
                clinic: profile.clinic_name || "",
                district: profile.clinic_district || "",
                address: profile.clinic_address || "",
                phone: profile.doctor_phone || user?.phone || "",
                nextSlot: "",
                image: profile.photo || "",
                accent: "#0f8fe8"
              }}
              size="md"
            />
          ) : (
            <Stethoscope size={30} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <small className="block text-xs font-medium text-ink-400">Doktor kabineti</small>
          <strong className="block truncate font-bold text-ink-900">
            {profile?.full_name || user?.full_name || "Shifokor"}
          </strong>
          <span className="mt-0.5 block truncate text-xs text-ink-500">
            {profile?.approval_status || user?.doctor_profile?.approval_status || "pending"} |{" "}
            {profile?.is_published ? "saytda ko'rinyapti" : "saytda yashirilgan"}
          </span>
        </div>
        <Button variant="secondary" size="sm" type="button" onClick={onRefresh} disabled={loading} className="shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          Yangilash
        </Button>
      </Card>

      {error && (
        <div
          className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-danger"
          role="alert"
        >
          <XCircle size={17} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col gap-0.5 p-3.5">
          <small className="text-xs text-ink-500">Yangi so&apos;rovlar</small>
          <strong className="text-2xl font-bold text-ink-900">{pendingAppointments.length}</strong>
          <span className="text-[0.7rem] leading-tight text-ink-400">Doktor tasdig&apos;i kutilmoqda</span>
        </Card>
        <Card className="flex flex-col gap-0.5 p-3.5">
          <small className="text-xs text-ink-500">Jadval</small>
          <strong className="text-2xl font-bold text-ink-900">{schedule.length}</strong>
          <span className="text-[0.7rem] leading-tight text-ink-400">Haftalik vaqt oynasi</span>
        </Card>
        <Card className="flex flex-col gap-0.5 p-3.5">
          <small className="text-xs text-ink-500">Reyting</small>
          <strong className="text-2xl font-bold text-ink-900">{profile?.rating || "0.0"}</strong>
          <span className="text-[0.7rem] leading-tight text-ink-400">{profile?.reviews_count || 0} ta sharh</span>
        </Card>
      </section>

      <Card as="section">
        <form onSubmit={onProfileSubmit} className="flex flex-col gap-3.5">
          <div>
            <strong className="block font-bold text-ink-900">Profil va rasm</strong>
            <span className="mt-0.5 block text-xs text-ink-500">O&apos;zgartirilsa admin qayta tasdiqlaydi.</span>
          </div>

          <label className="block">
            <span className={labelClass}>Mutaxassislik</span>
            <select name="specialty" defaultValue={profile?.specialty || specialtyOptions[0]} className={selectClass}>
              {specialtyOptions.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Ish staji"
              name="experience_years"
              type="number"
              min="0"
              max="80"
              defaultValue={profile?.experience_years || 0}
            />
            <Field label="Ish vaqti" name="work_time" defaultValue={profile?.work_time || ""} placeholder="09:00 - 18:00" />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-surface-200 bg-surface-50 p-3.5 transition-colors hover:border-brand-400 hover:bg-brand-50">
            <input
              type="file"
              name="photo_file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setPhotoFileName(event.currentTarget.files?.[0]?.name || "")}
              className="sr-only"
            />
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
              <ImageUp size={20} />
            </span>
            <span className="min-w-0">
              <strong className="block truncate font-semibold text-ink-900">{photoFileName || "Yangi rasm yuklash"}</strong>
              <small className="block text-xs text-ink-500">{photoFileName ? "Rasm tanlandi" : "JPG, PNG yoki WebP"}</small>
            </span>
          </label>

          <Field label="Rasm linki" name="photo" type="url" defaultValue={profile?.photo || ""} placeholder="https://..." />
          <Field label="Klinika" name="clinic_name" defaultValue={profile?.clinic_name || ""} />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Klinika tumani</span>
              <select name="clinic_district" defaultValue={profile?.clinic_district || districts[1]} className={selectClass}>
                {districts.slice(1).map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Telefon" name="doctor_phone" defaultValue={profile?.doctor_phone || user?.phone || ""} />
          </div>

          <TextareaField label="Manzil" name="clinic_address" defaultValue={profile?.clinic_address || ""} />
          <Field label="Lokatsiya linki" name="clinic_location_url" type="url" defaultValue={profile?.clinic_location_url || ""} />
          <TextareaField label="Klinikagacha borish" name="directions" defaultValue={profile?.directions || ""} />
          <TextareaField label="Doktor haqida" name="description" defaultValue={profile?.description || ""} />

          <Button type="submit" size="lg" disabled={loading}>
            <Save size={18} />
            Profilni saqlash
          </Button>
        </form>
      </Card>

      <Card as="section">
        <form onSubmit={onScheduleSubmit} className="flex flex-col gap-3.5">
          <div>
            <strong className="block font-bold text-ink-900">Haftalik bo&apos;sh vaqtlar</strong>
            <span className="mt-0.5 block text-xs text-ink-500">Masalan: Dushanba 09:00-18:00, 30 daqiqalik slot.</span>
          </div>

          {schedule.length > 0 && (
            <div className="flex flex-col gap-2">
              {schedule.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-surface-50 px-3.5 py-3">
                  <CalendarDays size={17} className="shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm font-semibold text-ink-900">{weekdayLabel(item.weekday)}</strong>
                    <small className="block text-xs text-ink-500">
                      {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)} | {item.slot_duration_minutes} daqiqa
                    </small>
                  </span>
                  <Badge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Faol" : "O'chirilgan"}</Badge>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Hafta kuni</span>
              <select name="weekday" defaultValue="0" className={selectClass}>
                {Array.from({ length: 7 }, (_, weekday) => (
                  <option key={weekday} value={weekday}>
                    {weekdayLabel(weekday)}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Slot davomiyligi" name="slot_duration_minutes" type="number" min="5" max="240" defaultValue="30" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Boshlanish" name="start_time" type="time" defaultValue="09:00" />
            <Field label="Tugash" name="end_time" type="time" defaultValue="18:00" />
          </div>

          <Field label="Izoh" name="note" placeholder="Masalan: faqat konsultatsiya" />

          <Button type="submit" size="lg" disabled={loading}>
            <Clock size={18} />
            Jadval qo&apos;shish
          </Button>
        </form>
      </Card>

      <Card as="section">
        <div className="mb-3.5">
          <strong className="block font-bold text-ink-900">Qabul so&apos;rovlari</strong>
          <span className="mt-0.5 block text-xs text-ink-500">
            Foydalanuvchini qabul qilish yoki sabab bilan rad etish.
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {appointments.map((appointment) => (
            <article key={appointment.id} className="rounded-2xl bg-surface-50 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate font-semibold text-ink-900">{appointment.full_name}</strong>
                  <small className="mt-0.5 block text-xs text-ink-500">
                    {appointment.appointment_date} | {appointment.appointment_time.slice(0, 5)} | {appointment.phone}
                  </small>
                </div>
                <Badge tone={statusTone(appointment.status)} className="shrink-0">
                  {appointmentStatusLabel(appointment.status)}
                </Badge>
              </div>
              {appointment.reject_reason && (
                <p className="mt-2 text-xs text-ink-500">Sabab: {appointment.reject_reason}</p>
              )}

              {appointment.status === "pending" && (
                <div className="mt-3 flex flex-col gap-2">
                  <Field
                    placeholder="Rad etish sababi"
                    value={rejectReasons[appointment.id] || ""}
                    onChange={(event) =>
                      setRejectReasons((current) => ({ ...current, [appointment.id]: event.target.value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" size="sm" onClick={() => onAppointmentAction(appointment, "confirm")}>
                      <CheckCircle2 size={16} />
                      Tasdiqlash
                    </Button>
                    <Button
                      variant="danger"
                      type="button"
                      size="sm"
                      onClick={() =>
                        onAppointmentAction(appointment, "reject", rejectReasons[appointment.id] || "Doktor tomonidan rad etildi.")
                      }
                    >
                      <XCircle size={16} />
                      Rad etish
                    </Button>
                  </div>
                </div>
              )}

              {appointment.status === "doctor_confirmed" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button type="button" size="sm" onClick={() => onAppointmentAction(appointment, "complete")}>
                    Yakunlandi
                  </Button>
                  <Button variant="danger" type="button" size="sm" onClick={() => onAppointmentAction(appointment, "mark_no_show")}>
                    Kelmadi
                  </Button>
                </div>
              )}
            </article>
          ))}
          {appointments.length === 0 && (
            <p className="rounded-2xl bg-surface-50 px-4 py-6 text-center text-sm text-ink-500">
              Hali qabul so&apos;rovlari yo&apos;q.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
