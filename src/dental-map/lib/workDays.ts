/**
 * The week, in the numbering the API uses.
 *
 * `WeeklyAvailability` numbers Monday as 0 and Sunday as 6. `Date.getDay()`
 * numbers Sunday as 0. Those two disagree on six days out of seven, and a form
 * that submitted the browser's numbering would book patients one day off and put
 * Sunday's on Monday -- invisible in a screenshot, obvious to a patient standing
 * outside a closed clinic.
 *
 * Data, not UI, so the mapping can be asserted by a test that does not need a
 * browser or a React renderer.
 */
export type WorkDay = { api: number; short: string; full: string };

export const WORK_DAYS: readonly WorkDay[] = [
  { api: 0, short: "Du", full: "Dushanba" },
  { api: 1, short: "Se", full: "Seshanba" },
  { api: 2, short: "Ch", full: "Chorshanba" },
  { api: 3, short: "Pa", full: "Payshanba" },
  { api: 4, short: "Ju", full: "Juma" },
  { api: 5, short: "Sh", full: "Shanba" },
  { api: 6, short: "Ya", full: "Yakshanba" },
];

/** The two patterns nearly every clinic here actually uses. */
export const WORK_DAY_PRESETS = [
  { label: "Dush–Juma", days: [0, 1, 2, 3, 4] },
  { label: "Dush–Shan", days: [0, 1, 2, 3, 4, 5] },
] as const;

/** What the form posts: sorted, deduplicated, comma separated. */
export function serializeWorkDays(days: readonly number[]) {
  return [...new Set(days)].sort((a, b) => a - b).join(",");
}
