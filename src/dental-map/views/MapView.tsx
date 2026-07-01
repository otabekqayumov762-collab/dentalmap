/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LayerGroup, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { ArrowLeft, Building2, Clock3, MapPin, Navigation, Search, Star, Stethoscope } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import { districts } from "../catalog";
import { geocodePlace } from "../lib/geocode";
import { requestUserLocation } from "../lib/location";
import { isYandexEnabled, loadYandex } from "../lib/yandex";
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

// Marker tone → colour. Kept as raw hex intentionally: these feed the map
// engines' own vector/placemark options (allowed exception to the no-hex rule).
const TONE_COLORS: Record<string, string> = {
  blue: "#2d8fea",
  teal: "#23a6a8",
  amber: "#f3d349"
};
const USER_COLOR = "#43a82d";

type MapClinicMarker = { clinic: Clinic; position: LatLng; tone: string };
type MapCanvasHandle = { recenter: (target?: LatLng) => void; searchTo: (query: string) => Promise<boolean> };
type MapCanvasProps = {
  userPosition: LatLng;
  clinics: MapClinicMarker[];
  onSelect: (clinic: Clinic) => void;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ── Yandex canvas (preferred for Uzbekistan; needs NEXT_PUBLIC_YANDEX_MAPS_API_KEY) ── */

const YandexCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function YandexCanvas(
  { userPosition: user, clinics, onSelect },
  ref
) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useImperativeHandle(
    ref,
    () => ({
      recenter(target?: LatLng) {
        mapRef.current?.setCenter(target ?? user, 15, { duration: 300 });
      },
      async searchTo(query: string) {
        const map = mapRef.current;
        const ymaps = (window as any).ymaps;
        if (!map || !ymaps) {
          return false;
        }
        const coords = await geocodePlace(query);
        if (!coords) {
          return false;
        }
        const point: [number, number] = [coords.lat, coords.lng];
        map.setCenter(point, 16, { duration: 300 });
        if (searchMarkerRef.current) {
          searchMarkerRef.current.geometry.setCoordinates(point);
        } else {
          const mark = new ymaps.Placemark(
            point,
            { iconCaption: query.trim() },
            { preset: "islands#redDotIconWithCaption" }
          );
          map.geoObjects.add(mark);
          searchMarkerRef.current = mark;
        }
        return true;
      }
    }),
    [user]
  );

  useEffect(() => {
    let cancelled = false;

    loadYandex()
      .then((ymaps) => {
        if (cancelled || !nodeRef.current || mapRef.current) {
          return;
        }
        const map = new ymaps.Map(
          nodeRef.current,
          { center: user, zoom: 13, controls: ["geolocationControl"] },
          { suppressMapOpenBlock: true }
        );
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => {
        // API key missing/blocked — chrome still renders, map stays empty.
      });

    return () => {
      cancelled = true;
      try {
        mapRef.current?.destroy();
      } catch {
        // map may not have finished initialising
      }
      mapRef.current = null;
      setReady(false);
    };
  }, [user]);

  useEffect(() => {
    const map = mapRef.current;
    const ymaps = (window as any).ymaps;
    if (!ready || !map || !ymaps) {
      return;
    }

    map.geoObjects.removeAll();
    searchMarkerRef.current = null;

    const userMark = new ymaps.Placemark(
      user,
      { iconCaption: "Siz" },
      { preset: "islands#circleDotIconWithCaption", iconColor: USER_COLOR }
    );
    map.geoObjects.add(userMark);

    clinics.forEach(({ clinic, position, tone }) => {
      const mark = new ymaps.Placemark(
        position,
        { iconCaption: clinic.name, hintContent: clinic.name },
        { preset: "islands#circleDotIconWithCaption", iconColor: TONE_COLORS[tone] ?? TONE_COLORS.blue }
      );
      mark.events.add("click", () => onSelectRef.current(clinic));
      map.geoObjects.add(mark);
    });

    const lats = [user[0], ...clinics.map(({ position }) => position[0])];
    const lngs = [user[1], ...clinics.map(({ position }) => position[1])];
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ];
    map.setBounds(bounds, {
      checkZoomRange: true,
      zoomMargin: [96, 42, 240, 42]
    });
  }, [clinics, ready, user]);

  return <div ref={nodeRef} className="absolute inset-0 z-0 bg-surface-100" aria-label="Interaktiv xarita" />;
});

/* ── Leaflet + OpenStreetMap fallback (no API key) ── */

const LeafletCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function LeafletCanvas(
  { userPosition: user, clinics, onSelect },
  ref
) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useImperativeHandle(
    ref,
    () => ({
      recenter(target?: LatLng) {
        mapRef.current?.setView(target ?? user, 15, { animate: true });
      },
      async searchTo(query: string) {
        const map = mapRef.current;
        if (!map) {
          return false;
        }
        const coords = await geocodePlace(query);
        if (!coords) {
          return false;
        }
        map.setView([coords.lat, coords.lng], 16, { animate: true });
        return true;
      }
    }),
    [user]
  );

  useEffect(() => {
    let cancelled = false;

    async function mountMap() {
      const L = await import("leaflet");
      if (cancelled || !nodeRef.current || mapRef.current) {
        return;
      }
      leafletRef.current = L;

      const map = L.map(nodeRef.current, {
        attributionControl: false,
        boxZoom: false,
        doubleClickZoom: true,
        dragging: true,
        keyboard: false,
        scrollWheelZoom: true,
        touchZoom: true,
        zoomControl: false
      }).setView(user, 13);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        keepBuffer: 6,
        maxZoom: 19,
        minZoom: 11,
        updateInterval: 80,
        updateWhenIdle: false,
        updateWhenZooming: true
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      window.setTimeout(() => map.invalidateSize(), 120);
    }

    void mountMap();

    return () => {
      cancelled = true;
      layerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setReady(false);
    };
  }, [user]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) {
      return;
    }

    layer.clearLayers();

    L.marker(user, {
      icon: L.divIcon({
        className: "map-leaflet-user-marker",
        html: "<span><b>Siz</b></span>",
        iconAnchor: [32, 64],
        iconSize: [64, 64]
      }),
      interactive: false
    }).addTo(layer);

    clinics.forEach(({ clinic, position, tone }) => {
      (
        L.marker(position, {
          icon: L.divIcon({
            className: `map-leaflet-clinic-marker ${tone}`,
            html: `<span>${escapeHtml(clinic.name)}</span>`,
            iconAnchor: [74, 44],
            iconSize: [148, 44]
          })
        }).addTo(layer) as LeafletMarker
      ).on("click", () => onSelectRef.current(clinic));
    });

    const bounds = L.latLngBounds([user, ...clinics.map(({ position }) => position)]);
    map.fitBounds(bounds, {
      animate: false,
      maxZoom: 14,
      paddingBottomRight: [42, 240],
      paddingTopLeft: [80, 144]
    });
  }, [clinics, ready, user]);

  return <div className="leaflet-map" ref={nodeRef} aria-label="Interaktiv xarita" />;
});

export function MapView({
  doctors,
  clinics,
  district,
  onDistrictChange,
  onBack,
  onAppointment
}: {
  doctors: Doctor[];
  clinics: Clinic[];
  district: string;
  onDistrictChange: (value: string) => void;
  onBack: () => void;
  onAppointment: (doctor: Doctor) => void;
}) {
  const canvasRef = useRef<MapCanvasHandle | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [mapQuery, setMapQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [userLoc, setUserLoc] = useState<LatLng>(userPosition);
  const [locating, setLocating] = useState(false);

  const featuredClinics = useMemo(() => clinics.slice(0, 3), [clinics]);
  const featuredDoctors = useMemo(() => doctors.slice(0, 2), [doctors]);

  const mapClinics = useMemo<MapClinicMarker[]>(
    () =>
      featuredClinics.map((clinic, index) => ({
        clinic,
        position:
          typeof clinic.lat === "number" && typeof clinic.lng === "number"
            ? ([clinic.lat, clinic.lng] as LatLng)
            : clinicPositions[index] ?? clinicPositions[0],
        tone: index === 1 ? "teal" : index === 2 ? "amber" : "blue"
      })),
    [featuredClinics]
  );

  // Reset any placemark selection when the visible clinic set changes.
  useEffect(() => {
    setSelectedClinicId(null);
  }, [featuredClinics]);

  const activeClinic =
    featuredClinics.find((clinic) => clinic.id === selectedClinicId) ?? featuredClinics[0];

  const openRoute = useCallback((clinic?: Clinic) => {
    const routeQuery = clinic
      ? `${clinic.name} ${clinic.district} ${clinic.address}`
      : "stomatologiya Toshkent";

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(routeQuery)}`, "_blank");
  }, []);

  const centerNearby = useCallback(async () => {
    setLocating(true);
    const coords = await requestUserLocation();
    setLocating(false);
    if (coords) {
      const point: LatLng = [coords.lat, coords.lng];
      setUserLoc(point);
      canvasRef.current?.recenter(point);
    } else {
      canvasRef.current?.recenter();
    }
  }, []);

  const handleSelect = useCallback((clinic: Clinic) => {
    setSelectedClinicId(clinic.id);
  }, []);

  const MapCanvas = isYandexEnabled() ? YandexCanvas : LeafletCanvas;

  return (
    <section
      className="relative isolate h-[var(--tg-viewport-height)] min-h-[var(--tg-viewport-height)] w-full overflow-hidden bg-surface-100"
      aria-label="Toshkent xaritasi"
    >
      <MapCanvas ref={canvasRef} userPosition={userLoc} clinics={mapClinics} onSelect={handleSelect} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 px-4 pt-4">
        <button
          type="button"
          aria-label="Ortga qaytish"
          onClick={onBack}
          className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-0 text-ink-700 shadow-float transition-colors hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95"
        >
          <ArrowLeft size={22} />
        </button>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!mapQuery.trim()) {
              return;
            }
            setSearching(true);
            await canvasRef.current?.searchTo(mapQuery);
            setSearching(false);
          }}
          className="pointer-events-auto flex h-11 flex-1 items-center gap-2 rounded-pill bg-surface-0 px-4 text-ink-900 shadow-float focus-within:ring-2 focus-within:ring-brand-400"
        >
          <Search size={19} className="shrink-0 text-ink-400" />
          <input
            type="search"
            enterKeyHint="search"
            value={mapQuery}
            onChange={(event) => setMapQuery(event.target.value)}
            placeholder="Manzil yoki joyni qidirish"
            className="w-full bg-transparent text-[0.95rem] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          {searching && <span className="shrink-0 text-xs text-ink-400">...</span>}
        </form>
      </div>

      <div
        className="absolute inset-x-0 top-[4.75rem] z-20 flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1"
        aria-label="Hududlar"
      >
        {districts.map((item) => (
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
          onClick={() => void centerNearby()}
          disabled={locating}
          className="mb-3 mr-4 inline-flex items-center gap-2 rounded-pill bg-surface-0 px-4 py-2.5 text-sm font-semibold text-brand-600 shadow-float transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95 disabled:opacity-70"
        >
          <Navigation size={20} className={locating ? "animate-pulse" : undefined} />
          <span>{locating ? "Aniqlanmoqda..." : "Yaqinimda"}</span>
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
            <Button variant="primary" size="sm" onClick={() => openRoute(activeClinic)} className="shrink-0">
              <Navigation size={16} />
              Marshrut
            </Button>
          </div>

          {activeClinic && (
            <Card className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Building2 size={18} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <strong className="truncate text-[0.95rem] font-semibold text-ink-900">{activeClinic.name}</strong>
                    {activeClinic.partner && (
                      <span className="shrink-0 rounded-pill bg-brand-50 px-2 py-0.5 text-[0.65rem] font-bold text-brand-600">
                        Hamkor
                      </span>
                    )}
                  </span>
                  <small className="flex items-center gap-1 text-xs text-ink-500">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">
                      {activeClinic.district}, {activeClinic.address}
                    </span>
                  </small>
                  <small className="flex items-center gap-1 text-xs text-ink-500">
                    <Clock3 size={13} className="shrink-0" />
                    {activeClinic.workTime}
                  </small>
                </span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <Star size={13} />
                {activeClinic.rating.toFixed(1)}
              </span>
            </Card>
          )}

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {featuredClinics
              .filter((clinic) => clinic.id !== activeClinic?.id)
              .map((clinic) => (
                <button
                  key={clinic.id}
                  type="button"
                  onClick={() => handleSelect(clinic)}
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
