/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Coords } from "./yandex";

/**
 * Asks the user for their location — through Telegram's LocationManager when the
 * mini-app runs inside Telegram (Bot API 8.0+), otherwise the browser
 * Geolocation API. Both paths prompt the user for permission. Resolves to null
 * if unavailable or the user declines.
 */
export function requestUserLocation(): Promise<Coords | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  const manager = (window as any).Telegram?.WebApp?.LocationManager;
  if (manager && typeof manager.getLocation === "function") {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: Coords | null) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };
      // Guard against a Telegram client that never calls back.
      window.setTimeout(() => finish(null), 10000);

      const read = () => {
        try {
          manager.getLocation((data: any) => {
            if (data && typeof data.latitude === "number" && typeof data.longitude === "number") {
              finish({ lat: data.latitude, lng: data.longitude });
            } else {
              finish(null);
            }
          });
        } catch {
          finish(null);
        }
      };

      try {
        if (manager.isInited) {
          read();
        } else {
          manager.init(read);
        }
      } catch {
        finish(null);
      }
    });
  }

  if (navigator.geolocation) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  return Promise.resolve(null);
}
