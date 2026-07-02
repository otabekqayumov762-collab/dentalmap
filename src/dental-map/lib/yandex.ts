/* eslint-disable @typescript-eslint/no-explicit-any */

export type Coords = { lat: number; lng: number };

export const TASHKENT: Coords = { lat: 41.3111, lng: 69.2797 };
// Tashkent bounding box for biased geocoding: [[south,west],[north,east]].
export const TASHKENT_BOUNDS: [[number, number], [number, number]] = [
  [40.9, 68.9],
  [41.6, 69.6]
];

export const YANDEX_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || "";

export function isYandexEnabled() {
  return Boolean(YANDEX_KEY);
}

/** Loads the Yandex Maps JS API (v2.1) once and resolves with the ready `ymaps`. */
export function loadYandex(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  const w = window as any;
  if (w.ymaps?.Map) {
    return Promise.resolve(w.ymaps);
  }
  return new Promise((resolve, reject) => {
    const ready = () => w.ymaps.ready(() => resolve(w.ymaps));
    const existing = document.getElementById("ymaps-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", ready);
      existing.addEventListener("error", reject);
      if (w.ymaps) {
        ready();
      }
      return;
    }
    const script = document.createElement("script");
    script.id = "ymaps-script";
    script.async = true;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_KEY)}&lang=ru_RU`;
    script.onload = ready;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function yandexMapsUrl({ lat, lng }: Coords) {
  const ll = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  return `https://yandex.uz/maps/?ll=${ll}&z=17&pt=${ll}`;
}
