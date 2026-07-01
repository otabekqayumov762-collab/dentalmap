// Builds a doctor's bookable days + time slots from the free times they entered.
// (In local/demo mode we synthesize from per-doctor `slots`; with a backend the
// doctor's weekly availability drives this.)

export type DaySlots = {
  iso: string; // YYYY-MM-DD
  weekday: number; // 0=Sun .. 6=Sat
  weekdayLabel: string;
  dayNum: number;
  slots: string[];
};

const WEEKDAY_SHORT = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Juma", "Shan"];
export const DEFAULT_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];
const WORKDAYS = new Set([1, 2, 3, 4, 5, 6]); // Mon–Sat

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Upcoming working days (with their time slots), past slots on today filtered out. */
export function upcomingDays(slots: string[] = DEFAULT_SLOTS, maxDays = 8, lookahead = 21): DaySlots[] {
  const now = new Date();
  const nowHHMM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const days: DaySlots[] = [];

  for (let offset = 0; offset < lookahead && days.length < maxDays; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const weekday = date.getDay();
    if (!WORKDAYS.has(weekday)) {
      continue;
    }
    const daySlots = offset === 0 ? slots.filter((slot) => slot > nowHHMM) : slots;
    if (daySlots.length === 0) {
      continue;
    }
    days.push({
      iso: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      weekday,
      weekdayLabel: WEEKDAY_SHORT[weekday],
      dayNum: date.getDate(),
      slots: daySlots
    });
  }

  return days;
}
