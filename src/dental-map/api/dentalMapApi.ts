import type { ApiClinic, ApiDoctor, Clinic, Doctor } from "../types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/[/]$/, "") || "http://localhost:8000";

export function isStaticPreviewHost() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.hostname.endsWith("github.io") || window.location.protocol === "file:";
}

const accentColors = ["#22b8ad", "#1d7eea", "#ef476f", "#7c3aed", "#0f8fe8"];

export function mapDoctor(item: ApiDoctor, index: number): Doctor {
  return {
    id: item.id,
    name: item.full_name || "Shifokor",
    specialty: item.specialty || "Stomatolog",
    rating: Number(item.rating ?? 0),
    reviews: item.reviews_count ?? 0,
    experience: typeof item.experience_years === "number" ? `${item.experience_years} yil` : "",
    clinic: item.clinic_name || "Klinika tanlanmagan",
    district: item.clinic_district || "Tuman kiritilmagan",
    address: item.clinic_address || "",
    locationUrl: item.clinic_location_url || undefined,
    phone: item.doctor_phone || "",
    nextSlot: "",
    image: item.photo || undefined,
    accent: accentColors[index % accentColors.length]
  };
}

export function flattenClinics(items: ApiClinic[]): Clinic[] {
  return items.flatMap((clinic) => {
    const branches = clinic.branches?.filter((branch) => branch.is_active !== false) ?? [];
    if (branches.length === 0) {
      return [
        {
          id: clinic.id,
          name: clinic.name || "Klinika",
          district: "Tuman kiritilmagan",
          address: "",
          workTime: "",
          rating: Number(clinic.rating ?? 0)
        }
      ];
    }

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.clinic_name || clinic.name || "Klinika",
      district: branch.district || "Tuman kiritilmagan",
      address: branch.address || "",
      workTime: branch.work_time || "",
      rating: Number(clinic.rating ?? 0)
    }));
  });
}

