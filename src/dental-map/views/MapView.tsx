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
    <section className="map-screen" aria-label="Toshkent xaritasi">
      <div className="leaflet-map" ref={mapNodeRef} aria-label="Interaktiv xarita" />

      <div className="map-top-controls">
        <button className="map-circle-control" type="button" aria-label="Ortga qaytish" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
        <label className="map-search-control">
          <Search size={19} />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Qidirish"
          />
        </label>
        <button className="map-circle-control" type="button" aria-label="Xarita filtrlari">
          <SlidersHorizontal size={21} />
        </button>
      </div>

      <div className="map-filter-rail" aria-label="Hududlar">
        {districts.slice(0, 7).map((item) => {
          const active = district === item;

          return (
            <button
              key={item}
              className={active ? "map-filter-chip active" : "map-filter-chip"}
              type="button"
              aria-pressed={active}
              onClick={() => onDistrictChange(item)}
            >
              {item}
            </button>
          );
        })}
      </div>

      <button className="map-nearby-control" type="button" onClick={centerNearby}>
        <Navigation size={20} />
        <span>Yaqinimda</span>
      </button>

      <section className="map-bottom-sheet" aria-label="Yaqin klinikalar">
        <span className="map-sheet-handle" aria-hidden="true" />
        <div className="map-sheet-head">
          <span>
            <strong>{district === "Barchasi" ? "Yaqin klinikalar" : district}</strong>
            <small>{featuredClinics.length || clinics.length} ta klinika ko&apos;rinmoqda</small>
          </span>
          <button type="button" onClick={() => openRoute(primaryClinic)}>
            <Navigation size={16} />
            Marshrut
          </button>
        </div>

        {primaryClinic && (
          <article className="map-featured-clinic">
            <div className="map-featured-main">
              <span className="map-clinic-icon">
                <Building2 size={18} />
              </span>
              <span className="map-clinic-copy">
                <strong>{primaryClinic.name}</strong>
                <small>
                  <MapPin size={13} />
                  {primaryClinic.district}, {primaryClinic.address}
                </small>
                <small>
                  <Clock3 size={13} />
                  {primaryClinic.workTime}
                </small>
              </span>
            </div>
            <div className="map-featured-meta">
              <span className="map-rating">
                <Star size={13} />
                {primaryClinic.rating.toFixed(1)}
              </span>
            </div>
          </article>
        )}

        <div className="map-clinic-strip">
          {featuredClinics.slice(1).map((clinic) => (
            <button key={clinic.id} className="map-clinic-card" type="button" onClick={() => openRoute(clinic)}>
              <Building2 size={15} />
              <span>
                <strong>{clinic.name}</strong>
                <small>{clinic.district}</small>
              </span>
              <span className="map-mini-rating">
                <Star size={12} />
                {clinic.rating.toFixed(1)}
              </span>
            </button>
          ))}
        </div>
        {featuredDoctors.length > 0 && (
          <div className="map-doctor-actions">
            {featuredDoctors.map((doctor) => (
              <button key={doctor.id} type="button" onClick={() => onAppointment(doctor)}>
                <Stethoscope size={15} />
                <span>{doctor.name}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
