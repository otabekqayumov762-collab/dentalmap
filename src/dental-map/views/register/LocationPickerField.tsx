"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Check, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { cn } from "../../ui";

type Coords = { lat: number; lng: number };

const TASHKENT: Coords = { lat: 41.3111, lng: 69.2797 };
const YANDEX_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || "";
// Tashkent bounding box for biased geocoding [[south,west],[north,east]].
const TASHKENT_BOUNDS: [[number, number], [number, number]] = [
  [40.9, 68.9],
  [41.6, 69.6]
];

function locationUrl({ lat, lng }: Coords) {
  const ll = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  return `https://yandex.uz/maps/?ll=${ll}&z=17&pt=${ll}`;
}

type ModalProps = {
  initial: Coords | null;
  onClose: () => void;
  onConfirm: (coords: Coords) => void;
};

function PickerFooter({
  coords,
  onConfirm,
  note
}: {
  coords: Coords | null;
  onConfirm: (coords: Coords) => void;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-surface-200 p-4">
      <p className="min-w-0 flex-1 text-sm text-ink-500">
        {note ? note : coords ? `Tanlangan: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Xaritani bosing yoki qidiring"}
      </p>
      <button
        type="button"
        disabled={!coords}
        onClick={() => coords && onConfirm(coords)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-brand-500 px-5 font-semibold text-white shadow-card transition-colors hover:bg-brand-600 disabled:opacity-55"
      >
        <Check size={18} />
        Tasdiqlash
      </button>
    </div>
  );
}

function PickerHeader({
  query,
  searching,
  inputId,
  onQueryChange,
  onSearch,
  onClose
}: {
  query: string;
  searching: boolean;
  inputId?: string;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-surface-200 p-3">
      <form className="flex flex-1 items-center gap-2 rounded-pill border border-surface-200 bg-surface-50 px-3" onSubmit={onSearch}>
        <Search size={17} className="shrink-0 text-ink-400" />
        <input
          id={inputId}
          autoComplete="off"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Manzil yoki klinika nomini qidiring"
          className="h-10 min-w-0 flex-1 bg-transparent text-ink-900 outline-none placeholder:text-ink-400"
        />
        {searching && <span className="shrink-0 text-xs text-ink-400">...</span>}
      </form>
      <button
        type="button"
        aria-label="Yopish"
        onClick={onClose}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-surface-100"
      >
        <X size={20} />
      </button>
    </div>
  );
}

/* ── Yandex Maps (preferred for Uzbekistan; needs NEXT_PUBLIC_YANDEX_MAPS_API_KEY) ── */

function loadYandex(key: string): Promise<any> {
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
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    script.onload = ready;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function YandexPickerModal({ initial, onClose, onConfirm }: ModalProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [coords, setCoords] = useState<Coords | null>(initial);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    document.body.style.overflow = "hidden";

    loadYandex(YANDEX_KEY)
      .then((ymaps) => {
        if (cancelled || !nodeRef.current) {
          return;
        }
        const start = initial ?? TASHKENT;
        const map = new ymaps.Map(
          nodeRef.current,
          { center: [start.lat, start.lng], zoom: 12, controls: ["zoomControl", "geolocationControl"] },
          { suppressMapOpenBlock: true }
        );
        const marker = new ymaps.Placemark([start.lat, start.lng], {}, { preset: "islands#blueDotIcon", draggable: true });
        map.geoObjects.add(marker);
        marker.events.add("dragend", () => {
          const point = marker.geometry.getCoordinates();
          setCoords({ lat: point[0], lng: point[1] });
        });
        map.events.add("click", (event: any) => {
          const point = event.get("coords");
          marker.geometry.setCoordinates(point);
          setCoords({ lat: point[0], lng: point[1] });
        });
        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => {
        if (!cancelled) {
          setError("Yandex xaritasini yuklab bo'lmadi. API kalitni tekshiring.");
        }
      });

    return () => {
      cancelled = true;
      document.body.style.overflow = "";
      try {
        mapRef.current?.destroy();
      } catch {
        // map may not be initialised yet
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initial]);

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (!term || !mapRef.current) {
      return;
    }
    setSearching(true);
    try {
      const ymaps = (window as any).ymaps;
      const result = await ymaps.geocode(term, { results: 1, boundedBy: TASHKENT_BOUNDS });
      const first = result.geoObjects.get(0);
      if (first) {
        const point = first.geometry.getCoordinates();
        mapRef.current.setCenter(point, 16);
        markerRef.current.geometry.setCoordinates(point);
        setCoords({ lat: point[0], lng: point[1] });
      }
    } catch {
      // best-effort search
    } finally {
      setSearching(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">
      <PickerHeader
        query={query}
        searching={searching}
        onQueryChange={setQuery}
        onSearch={runSearch}
        onClose={onClose}
      />
      <div ref={nodeRef} className="min-h-0 flex-1" aria-label="Yandex lokatsiya xaritasi" />
      <PickerFooter coords={coords} onConfirm={onConfirm} note={error || undefined} />
    </div>,
    document.body
  );
}

/* ── OpenStreetMap fallback (no API key) ── */

function OsmPickerModal({ initial, onClose, onConfirm }: ModalProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const [coords, setCoords] = useState<Coords | null>(initial);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    document.body.style.overflow = "hidden";

    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !nodeRef.current) {
        return;
      }
      const start = initial ?? TASHKENT;
      const map = L.map(nodeRef.current, { attributionControl: false }).setView([start.lat, start.lng], 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const marker = L.circleMarker([start.lat, start.lng], {
        radius: 10,
        color: "#16a8b5",
        weight: 3,
        fillColor: "#16a8b5",
        fillOpacity: 0.9
      }).addTo(map);
      map.on("click", (event) => {
        marker.setLatLng(event.latlng);
        setCoords({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
      mapRef.current = map;
      markerRef.current = marker;
      window.setTimeout(() => map.invalidateSize(), 60);
    })();

    return () => {
      cancelled = true;
      document.body.style.overflow = "";
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initial]);

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(term)}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await response.json();
      if (Array.isArray(data) && data[0]) {
        const next = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
        mapRef.current?.setView([next.lat, next.lng], 16);
        markerRef.current?.setLatLng([next.lat, next.lng]);
        setCoords(next);
      }
    } catch {
      // best-effort search
    } finally {
      setSearching(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">
      <PickerHeader
        query={query}
        searching={searching}
        onQueryChange={setQuery}
        onSearch={runSearch}
        onClose={onClose}
      />
      <div ref={nodeRef} className="min-h-0 flex-1" aria-label="Lokatsiya xaritasi" />
      <PickerFooter coords={coords} onConfirm={onConfirm} />
    </div>,
    document.body
  );
}

export function LocationPickerField({
  name,
  label = "Klinika lokatsiyasi",
  defaultValue = ""
}: {
  name: string;
  label?: string;
  defaultValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [value, setValue] = useState(defaultValue);

  const PickerModal = YANDEX_KEY ? YandexPickerModal : OsmPickerModal;

  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
          value
            ? "border-brand-300 bg-brand-50 text-brand-700"
            : "border-dashed border-surface-200 bg-surface-50 text-ink-500 hover:border-brand-300"
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            value ? "bg-brand-500 text-white" : "bg-surface-0 text-brand-500"
          )}
        >
          <MapPin size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-semibold">
            {value ? "Lokatsiya tanlandi" : "Kartadan tanlash"}
          </strong>
          <small className="block truncate text-xs">
            {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Xaritani ochib joyni belgilang"}
          </small>
        </span>
      </button>

      {open && (
        <PickerModal
          initial={coords}
          onClose={() => setOpen(false)}
          onConfirm={(next) => {
            setCoords(next);
            setValue(locationUrl(next));
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
