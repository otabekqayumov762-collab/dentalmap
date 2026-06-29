const accentClassByColor: Record<string, string> = {
  "#22b8ad": "accent-teal",
  "#1d7eea": "accent-blue",
  "#ef476f": "accent-rose",
  "#7c3aed": "accent-violet",
  "#0f8fe8": "accent-sky"
};

export function doctorAccentClass(accent?: string) {
  return accentClassByColor[String(accent || "").toLowerCase()] || "accent-teal";
}
