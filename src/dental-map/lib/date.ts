// Uzbek date formatting — avoids the odd "M07" output from Intl uz-UZ locale.

const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr"
];

/** "2026-07-02" → "2-iyul". Falls back to the raw string if unparseable. */
export function formatUzDate(iso?: string | null): string {
  if (!iso) {
    return "";
  }
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  return `${day}-${UZ_MONTHS[month - 1] ?? month}`;
}
