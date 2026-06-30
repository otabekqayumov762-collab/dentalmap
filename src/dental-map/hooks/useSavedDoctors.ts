"use client";

import { useCallback, useEffect, useState } from "react";
import type { TelegramWebApp } from "../types";

const SAVED_DOCTORS_KEY = "dentalmap_saved_doctors";

/**
 * Persists the patient's saved doctors to local storage and exposes a toggle.
 */
export function useSavedDoctors(webApp: TelegramWebApp | null) {
  const [savedDoctorIds, setSavedDoctorIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(SAVED_DOCTORS_KEY);
      if (rawValue) {
        const parsedValue = JSON.parse(rawValue);
        if (Array.isArray(parsedValue)) {
          setSavedDoctorIds(parsedValue.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch {
      setSavedDoctorIds([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(SAVED_DOCTORS_KEY, JSON.stringify(savedDoctorIds));
    } catch {
      // Storage may be unavailable in embedded/private browser contexts.
    }
  }, [savedDoctorIds, hydrated]);

  const toggleSavedDoctor = useCallback(
    (doctorId: string) => {
      webApp?.HapticFeedback?.selectionChanged();
      setSavedDoctorIds((current) =>
        current.includes(doctorId)
          ? current.filter((id) => id !== doctorId)
          : [...current, doctorId]
      );
    },
    [webApp]
  );

  return { savedDoctorIds, toggleSavedDoctor };
}
