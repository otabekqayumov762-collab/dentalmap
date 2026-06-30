const APPOINTMENT_LEADS_KEY = "dentalmap_appointment_leads";
const SHEETS_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL || "";

export type AppointmentLead = {
  id: string;
  createdAt: string;
  doctorId: string;
  doctorName: string;
  clinic: string;
  district: string;
  selectedSlot: string;
  fullName: string;
  phone: string;
  gender: string;
  age: string;
  appointmentDate: string;
  note: string;
};

export function normalizeGender(value: string) {
  if (value === "Erkak") {
    return "male";
  }
  if (value === "Ayol") {
    return "female";
  }
  return value;
}

export function persistAppointmentLead(lead: AppointmentLead) {
  try {
    const rawValue = window.localStorage.getItem(APPOINTMENT_LEADS_KEY);
    const existingLeads = rawValue ? JSON.parse(rawValue) : [];
    const leads = Array.isArray(existingLeads) ? existingLeads : [];
    window.localStorage.setItem(APPOINTMENT_LEADS_KEY, JSON.stringify([lead, ...leads].slice(0, 100)));
  } catch {
    // The lead is still submitted in the current session even if local storage is blocked.
  }

  if (!SHEETS_WEBHOOK_URL) {
    return;
  }

  void fetch(SHEETS_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(lead)
  }).catch(() => {
    // Network sync is best-effort; local queue above keeps the request recoverable.
  });
}
