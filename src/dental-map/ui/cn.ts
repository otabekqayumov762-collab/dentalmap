/** Joins class names, dropping falsy values. Keeps JSX readable without a dep. */
export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
