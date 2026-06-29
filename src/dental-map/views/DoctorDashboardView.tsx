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
    <div className="view-stack doctor-dashboard">
      <section className="doctor-dashboard-hero">
        <div className="doctor-dashboard-avatar">
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
        <div>
          <small>Doktor kabineti</small>
          <strong>{profile?.full_name || user?.full_name || "Shifokor"}</strong>
          <span>
            {profile?.approval_status || user?.doctor_profile?.approval_status || "pending"} |{" "}
            {profile?.is_published ? "saytda ko'rinyapti" : "saytda yashirilgan"}
          </span>
        </div>
        <button className="doctor-refresh" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 size={16} /> : <RefreshCcw size={16} />}
          Yangilash
        </button>
      </section>

      {error && (
        <div className="form-error" role="alert">
          <XCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      <section className="doctor-dashboard-grid">
        <article className="doctor-stat-card">
          <small>Yangi so&apos;rovlar</small>
          <strong>{pendingAppointments.length}</strong>
          <span>Doktor tasdig&apos;i kutilmoqda</span>
        </article>
        <article className="doctor-stat-card">
          <small>Jadval</small>
          <strong>{schedule.length}</strong>
          <span>Haftalik vaqt oynasi</span>
        </article>
        <article className="doctor-stat-card">
          <small>Reyting</small>
          <strong>{profile?.rating || "0.0"}</strong>
          <span>{profile?.reviews_count || 0} ta sharh</span>
        </article>
      </section>

      <form className="consult-form doctor-panel-form" onSubmit={onProfileSubmit}>
        <div className="panel-title">
          <strong>Profil va rasm</strong>
          <span>O&apos;zgartirilsa admin qayta tasdiqlaydi.</span>
        </div>
        <label>
          <span>Mutaxassislik</span>
          <select name="specialty" defaultValue={profile?.specialty || specialtyOptions[0]}>
            {specialtyOptions.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
        </label>
        <div className="two-fields">
          <label>
            <span>Ish staji</span>
            <input name="experience_years" type="number" min="0" max="80" defaultValue={profile?.experience_years || 0} />
          </label>
          <label>
            <span>Ish vaqti</span>
            <input name="work_time" defaultValue={profile?.work_time || ""} placeholder="09:00 - 18:00" />
          </label>
        </div>
        <label className="upload-card">
          <input
            type="file"
            name="photo_file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setPhotoFileName(event.currentTarget.files?.[0]?.name || "")}
          />
          <span className="upload-icon">
            <ImageUp size={20} />
          </span>
          <span className="upload-copy">
            <strong>{photoFileName || "Yangi rasm yuklash"}</strong>
            <small>{photoFileName ? "Rasm tanlandi" : "JPG, PNG yoki WebP"}</small>
          </span>
        </label>
        <label>
          <span>Rasm linki</span>
          <input name="photo" type="url" defaultValue={profile?.photo || ""} placeholder="https://..." />
        </label>
        <label>
          <span>Klinika</span>
          <input name="clinic_name" defaultValue={profile?.clinic_name || ""} />
        </label>
        <div className="two-fields">
          <label>
            <span>Klinika tumani</span>
            <select name="clinic_district" defaultValue={profile?.clinic_district || districts[1]}>
              {districts.slice(1).map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Telefon</span>
            <input name="doctor_phone" defaultValue={profile?.doctor_phone || user?.phone || ""} />
          </label>
        </div>
        <label>
          <span>Manzil</span>
          <textarea name="clinic_address" defaultValue={profile?.clinic_address || ""} />
        </label>
        <label>
          <span>Lokatsiya linki</span>
          <input name="clinic_location_url" type="url" defaultValue={profile?.clinic_location_url || ""} />
        </label>
        <label>
          <span>Klinikagacha borish</span>
          <textarea name="directions" defaultValue={profile?.directions || ""} />
        </label>
        <label>
          <span>Doktor haqida</span>
          <textarea name="description" defaultValue={profile?.description || ""} />
        </label>
        <button className="primary-btn submit" type="submit" disabled={loading}>
          <Save size={18} />
          Profilni saqlash
        </button>
      </form>

      <form className="consult-form doctor-panel-form" onSubmit={onScheduleSubmit}>
        <div className="panel-title">
          <strong>Haftalik bo&apos;sh vaqtlar</strong>
          <span>Masalan: Dushanba 09:00-18:00, 30 daqiqalik slot.</span>
        </div>
        <div className="schedule-list">
          {schedule.map((item) => (
            <div key={item.id} className="schedule-row">
              <CalendarDays size={17} />
              <span>
                <strong>{weekdayLabel(item.weekday)}</strong>
                <small>
                  {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)} | {item.slot_duration_minutes} daqiqa
                </small>
              </span>
              <em>{item.is_active ? "Faol" : "O'chirilgan"}</em>
            </div>
          ))}
        </div>
        <div className="two-fields">
          <label>
            <span>Hafta kuni</span>
            <select name="weekday" defaultValue="0">
              {Array.from({ length: 7 }, (_, weekday) => (
                <option key={weekday} value={weekday}>
                  {weekdayLabel(weekday)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Slot davomiyligi</span>
            <input name="slot_duration_minutes" type="number" min="5" max="240" defaultValue="30" />
          </label>
        </div>
        <div className="two-fields">
          <label>
            <span>Boshlanish</span>
            <input name="start_time" type="time" defaultValue="09:00" />
          </label>
          <label>
            <span>Tugash</span>
            <input name="end_time" type="time" defaultValue="18:00" />
          </label>
        </div>
        <label>
          <span>Izoh</span>
          <input name="note" placeholder="Masalan: faqat konsultatsiya" />
        </label>
        <button className="primary-btn submit" type="submit" disabled={loading}>
          <Clock size={18} />
          Jadval qo&apos;shish
        </button>
      </form>

      <section className="doctor-appointments">
        <div className="panel-title">
          <strong>Qabul so&apos;rovlari</strong>
          <span>Foydalanuvchini qabul qilish yoki sabab bilan rad etish.</span>
        </div>
        {appointments.map((appointment) => (
          <article key={appointment.id} className="doctor-appointment-card">
            <div>
              <strong>{appointment.full_name}</strong>
              <small>
                {appointment.appointment_date} | {appointment.appointment_time.slice(0, 5)} | {appointment.phone}
              </small>
              <em>{appointmentStatusLabel(appointment.status)}</em>
              {appointment.reject_reason && <p>Sabab: {appointment.reject_reason}</p>}
            </div>
            {appointment.status === "pending" && (
              <div className="appointment-actions">
                <button type="button" onClick={() => onAppointmentAction(appointment, "confirm")}>
                  <CheckCircle2 size={16} />
                  Tasdiqlash
                </button>
                <input
                  placeholder="Rad etish sababi"
                  value={rejectReasons[appointment.id] || ""}
                  onChange={(event) =>
                    setRejectReasons((current) => ({ ...current, [appointment.id]: event.target.value }))
                  }
                />
                <button
                  className="danger"
                  type="button"
                  onClick={() => onAppointmentAction(appointment, "reject", rejectReasons[appointment.id] || "Doktor tomonidan rad etildi.")}
                >
                  <XCircle size={16} />
                  Rad etish
                </button>
              </div>
            )}
            {appointment.status === "doctor_confirmed" && (
              <div className="appointment-actions two">
                <button type="button" onClick={() => onAppointmentAction(appointment, "complete")}>
                  Yakunlandi
                </button>
                <button className="danger" type="button" onClick={() => onAppointmentAction(appointment, "mark_no_show")}>
                  Kelmadi
                </button>
              </div>
            )}
          </article>
        ))}
        {appointments.length === 0 && <p className="empty-panel-text">Hali qabul so&apos;rovlari yo&apos;q.</p>}
      </section>
    </div>
  );
}
