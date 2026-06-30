import type { LayerGroup, Map as LeafletMap } from "leaflet";
import {
  ArrowLeft,
  Building2,
  Clock3,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { districts } from "../catalog";
import type { Clinic, Doctor } from "../types";
import { Button, Card, Chip } from "../ui";

type LeafletModule = typeof import("leaflet");
type LatLng = [number, number];

const userPosition: LatLng = [41.2858, 69.2463];
const clinicPositions: LatLng[] = [
  [41.2924, 69.2298],
  [41.2828, 69.2683],
  [41.2746, 69.2362]
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function MapView({
  doctors,
  clinics,
  query,
  district,
  onQueryChange,
  onDistrictChange,
  onBack,
  onAppointment
}: {
  doctors: Doctor[];
  clinics: Clinic[];
  query: string;
  district: string;
  onQueryChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onBack: () => void;
  onAppointment: (doctor: Doctor) => void;
}) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const featuredClinics = useMemo(() => clinics.slice(0, 3), [clinics]);
  const featuredDoctors = useMemo(() => doctors.slice(0, 2), [doctors]);
  const primaryClinic = featuredClinics[0];

  const mapClinics = useMemo(
    () =>
      featuredClinics.map((clinic, index) => ({
        clinic,
        position: clinicPositions[index] ?? clinicPositions[0],
        tone: index === 1 ? "teal" : index === 2 ? "amber" : "blue"
      })),
    [featuredClinics]
  );

  const openRoute = useCallback((clinic?: Clinic) => {
    const routeQuery = clinic
      ? `${clinic.name} ${clinic.district} ${clinic.address}`
      : "stomatologiya Toshkent";

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(routeQuery)}`, "_blank");
  }, []);

  const centerNearby = useCallback(() => {
    mapInstanceRef.current?.setView(userPosition, 15, { animate: true });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function mountMap() {
      const L = await import("leaflet");

      if (cancelled || !mapNodeRef.current || mapInstanceRef.current) {
        return;
      }

      leafletRef.current = L;

      const map = L.map(mapNodeRef.current, {
        attributionControl: false,
        boxZoom: false,
        doubleClickZoom: true,
        dragging: true,
        keyboard: false,
        scrollWheelZoom: true,
        touchZoom: true,
        zoomControl: false
      }).setView(userPosition, 13);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        keepBuffer: 6,
        maxZoom: 19,
        minZoom: 11,
        updateInterval: 80,
        updateWhenIdle: false,
        updateWhenZooming: true
      }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setMapReady(true);

      window.setTimeout(() => map.invalidateSize(), 120);
    }

    void mountMap();

    return () => {
      cancelled = true;
      markerLayerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const layer = markerLayerRef.current;

    if (!mapReady || !L || !map || !layer) {
      return;
    }

    layer.clearLayers();

    L.marker(userPosition, {
      icon: L.divIcon({
        className: "map-leaflet-user-marker",
        html: "<span><b>Siz</b></span>",
        iconAnchor: [32, 64],
        iconSize: [64, 64]
      }),
      interactive: false
    }).addTo(layer);

    mapClinics.forEach(({ clinic, position, tone }) => {
      L.marker(position, {
        icon: L.divIcon({
          className: `map-leaflet-clinic-marker ${tone}`,
          html: `<span>${escapeHtml(clinic.name)}</span>`,
          iconAnchor: [74, 44],
          iconSize: [148, 44]
        })
      })
        .addTo(layer)
        .on("click", () => openRoute(clinic));
    });

    const bounds = L.latLngBounds([userPosition, ...mapClinics.map(({ position }) => position)]);
    map.fitBounds(bounds, {
      animate: false,
      maxZoom: 14,
      paddingBottomRight: [42, 240],
      paddingTopLeft: [80, 144]
    });
  }, [mapClinics, mapReady, openRoute]);

  return (
    <section
      className="relative isolate h-[var(--tg-viewport-height)] min-h-[var(--tg-viewport-height)] w-full overflow-hidden bg-surface-100"
      aria-label="Toshkent xaritasi"
    >
      <div className="leaflet-map" ref={mapNodeRef} aria-label="Interaktiv xarita" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 px-4 pt-4">
        <button
          type="button"
          aria-label="Ortga qaytish"
          onClick={onBack}
          className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-0 text-ink-700 shadow-float transition-colors hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95"
        >
          <ArrowLeft size={22} />
        </button>
        <label className="pointer-events-auto flex h-11 flex-1 items-center gap-2 rounded-pill bg-surface-0 px-4 text-ink-900 shadow-float focus-within:ring-2 focus-within:ring-brand-400">
          <Search size={19} className="shrink-0 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Qidirish"
            className="w-full bg-transparent text-[0.95rem] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
        </label>
        <button
          type="button"
          aria-label="Xarita filtrlari"
          className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-0 text-ink-700 shadow-float transition-colors hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95"
        >
          <SlidersHorizontal size={21} />
        </button>
      </div>

      <div
        className="absolute inset-x-0 top-[4.75rem] z-20 flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1"
        aria-label="Hududlar"
      >
        {districts.slice(0, 7).map((item) => (
          <Chip
            key={item}
            active={district === item}
            onClick={() => onDistrictChange(item)}
            className="shrink-0 shadow-card"
          >
            {item}
          </Chip>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-end">
        <button
          type="button"
          onClick={centerNearby}
          className="mb-3 mr-4 inline-flex items-center gap-2 rounded-pill bg-surface-0 px-4 py-2.5 text-sm font-semibold text-brand-600 shadow-float transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95"
        >
          <Navigation size={20} />
          <span>Yaqinimda</span>
        </button>

        <section
          className="w-full rounded-t-sheet bg-surface-0 px-4 pb-6 pt-3 shadow-float"
          aria-label="Yaqin klinikalar"
        >
          <span className="mx-auto mb-3 block h-1.5 w-10 rounded-pill bg-surface-200" aria-hidden="true" />

          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="flex min-w-0 flex-col">
              <strong className="truncate text-base font-bold text-ink-900">
                {district === "Barchasi" ? "Yaqin klinikalar" : district}
              </strong>
              <small className="text-xs text-ink-500">
                {featuredClinics.length || clinics.length} ta klinika ko&apos;rinmoqda
              </small>
            </span>
            <Button variant="primary" size="sm" onClick={() => openRoute(primaryClinic)} className="shrink-0">
              <Navigation size={16} />
              Marshrut
            </Button>
          </div>

          {primaryClinic && (
            <Card className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Building2 size={18} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <strong className="truncate text-[0.95rem] font-semibold text-ink-900">{primaryClinic.name}</strong>
                  <small className="flex items-center gap-1 text-xs text-ink-500">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">
                      {primaryClinic.district}, {primaryClinic.address}
                    </span>
                  </small>
                  <small className="flex items-center gap-1 text-xs text-ink-500">
                    <Clock3 size={13} className="shrink-0" />
                    {primaryClinic.workTime}
                  </small>
                </span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <Star size={13} />
                {primaryClinic.rating.toFixed(1)}
              </span>
            </Card>
          )}

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {featuredClinics.slice(1).map((clinic) => (
              <button
                key={clinic.id}
                type="button"
                onClick={() => openRoute(clinic)}
                className="flex min-w-44 shrink-0 items-center gap-2 rounded-2xl bg-surface-50 px-3 py-2.5 text-left transition-colors hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.98]"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Building2 size={15} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong className="truncate text-sm font-semibold text-ink-900">{clinic.name}</strong>
                  <small className="truncate text-xs text-ink-500">{clinic.district}</small>
                </span>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-amber-600">
                  <Star size={12} />
                  {clinic.rating.toFixed(1)}
                </span>
              </button>
            ))}
          </div>

          {featuredDoctors.length > 0 && (
            <div className="mt-3 flex gap-2">
              {featuredDoctors.map((doctor) => (
                <Button
                  key={doctor.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => onAppointment(doctor)}
                  className="flex-1"
                >
                  <Stethoscope size={15} />
                  <span className="truncate">{doctor.name}</span>
                </Button>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
