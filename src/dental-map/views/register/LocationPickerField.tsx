"use client";

import { Check, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { cn } from "../../ui";

type Coords = { lat: number; lng: number };

const TASHKENT: Coords = { lat: 41.3111, lng: 69.2797 };

function mapsUrl({ lat, lng }: Coords) {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function PickerModal({
  initial,
  onClose,
  onConfirm
}: {
  initial: Coords | null;
  onClose: () => void;
  onConfirm: (coords: Coords) => void;
}) {
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
        const next = { lat: event.latlng.lat, lng: event.latlng.lng };
        marker.setLatLng(event.latlng);
        setCoords(next);
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
      // Search is best-effort; the user can still tap the map.
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">
      <div className="flex items-center gap-2 border-b border-surface-200 p-3">
        <form className="flex flex-1 items-center gap-2 rounded-pill border border-surface-200 bg-surface-50 px-3" onSubmit={runSearch}>
          <Search size={17} className="shrink-0 text-ink-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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

      <div ref={nodeRef} className="min-h-0 flex-1" aria-label="Lokatsiya xaritasi" />

      <div className="flex items-center gap-3 border-t border-surface-200 p-4">
        <p className="min-w-0 flex-1 text-sm text-ink-500">
          {coords
            ? `Tanlangan: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
            : "Xaritani bosing yoki qidiring"}
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
    </div>
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
            setValue(mapsUrl(next));
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
