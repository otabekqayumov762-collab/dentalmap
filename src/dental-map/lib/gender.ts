export function normalizeGender(value: string) {
  if (value === "Erkak") {
    return "male";
  }
  if (value === "Ayol") {
    return "female";
  }
  return value;
}
