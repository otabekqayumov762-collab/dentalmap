import type { Coords } from "./yandex";

/**
 * Free place search via Nominatim (OpenStreetMap) — no API key required.
 * We use this instead of Yandex's geocoder because the free Yandex JS Maps key
 * is not authorized for the Geocoder/Search HTTP API (returns 401). Biased to
 * Uzbekistan. `nominatim.openstreetmap.org` is whitelisted in the build CSP.
 */
export async function geocodePlace(query: string): Promise<Coords | null> {
  const term = query.trim();
  if (!term) {
    return null;
  }
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=uz&accept-language=uz,ru&q=${encodeURIComponent(term)}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await response.json();
    if (Array.isArray(data) && data[0]) {
      return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
    }
  } catch {
    // best-effort search
  }
  return null;
}
