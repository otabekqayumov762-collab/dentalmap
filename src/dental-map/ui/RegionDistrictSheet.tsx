"use client";

import { Check, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { regionDistricts, regions } from "../catalog";
import { cn } from "./cn";
import { Sheet } from "./Sheet";

export type RegionDistrictSelection = { region: string | null; district: string | null };

const rowBase =
  "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[0.95rem] transition-colors";
const rowIdle = "border-surface-200 bg-surface-0 text-ink-700 hover:border-brand-300";
const rowActive = "border-brand-500 bg-brand-50 font-semibold text-brand-700";

/**
 * One bottom sheet with two internal pages: hudud (region) → tuman (district).
 * Page 1 lists the regions; tapping one slides to page 2 with that region's
 * districts (plus a "‹ Orqaga" back link and a "Barchasi" whole-region option).
 * Selecting a district (or "Barcha hududlar" / "Barchasi") returns the choice
 * and closes the sheet. Built on the shared ui/Sheet primitive.
 */
export function RegionDistrictSheet({
  open,
  onClose,
  onSelect,
  selected
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: RegionDistrictSelection) => void;
  selected?: RegionDistrictSelection;
}) {
  const [page, setPage] = useState<"regions" | "districts">("regions");
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  // Always re-enter on the region page whenever the sheet opens.
  useEffect(() => {
    if (open) {
      setPage("regions");
      setActiveRegion(null);
    }
  }, [open]);

  const isAllSelected = !selected?.region && !selected?.district;

  function choose(selection: RegionDistrictSelection) {
    onSelect(selection);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={page === "regions" ? "Hudud tanlang" : activeRegion ?? "Tuman tanlang"}
    >
      {page === "regions" ? (
        <div className="flex flex-col gap-1.5" role="listbox" aria-label="Hududlar">
          <button
            type="button"
            onClick={() => choose({ region: null, district: null })}
            className={cn(rowBase, isAllSelected ? rowActive : rowIdle)}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <MapPin size={15} />
              </span>
              <span className="min-w-0 truncate">Barcha hududlar</span>
            </span>
            {isAllSelected && <Check size={16} className="shrink-0 text-brand-600" />}
          </button>

          {regions.map((region) => {
            const isRegionSelected = selected?.region === region;

            return (
              <button
                key={region}
                type="button"
                onClick={() => {
                  setActiveRegion(region);
                  setPage("districts");
                }}
                className={cn(rowBase, isRegionSelected ? "border-brand-300 bg-brand-50/60 text-ink-900" : rowIdle)}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <MapPin size={15} />
                  </span>
                  <span className="min-w-0 truncate">{region}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-400" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5" role="listbox" aria-label={activeRegion ?? "Tumanlar"}>
          <button
            type="button"
            onClick={() => setPage("regions")}
            className="mb-1 inline-flex w-fit items-center gap-1 rounded-pill px-2.5 py-1.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
          >
            <ChevronLeft size={16} />
            Orqaga
          </button>

          <button
            type="button"
            onClick={() => choose({ region: activeRegion, district: null })}
            className={cn(
              rowBase,
              selected?.region === activeRegion && !selected?.district ? rowActive : rowIdle
            )}
          >
            <span className="min-w-0 truncate">Barchasi</span>
            {selected?.region === activeRegion && !selected?.district && (
              <Check size={16} className="shrink-0 text-brand-600" />
            )}
          </button>

          {(activeRegion ? regionDistricts[activeRegion] ?? [] : []).map((district) => {
            const active = selected?.district === district;

            return (
              <button
                key={district}
                type="button"
                onClick={() => choose({ region: activeRegion, district })}
                className={cn(rowBase, active ? rowActive : rowIdle)}
              >
                <span className="min-w-0 truncate">{district}</span>
                {active && <Check size={16} className="shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

/**
 * Form-facing + Home-facing wrapper mirroring MultiSelectSheet: a trigger button
 * showing "Region · District" (or a placeholder) that opens the sheet, plus a
 * hidden input carrying the district for the form contract. Region is UI-only.
 */
export function RegionDistrictField({
  name,
  label,
  region,
  district,
  onSelect,
  placeholder = "Hudud tanlang",
  error
}: {
  name?: string;
  label?: string;
  region: string | null;
  district: string | null;
  onSelect: (selection: RegionDistrictSelection) => void;
  placeholder?: string;
  /** Swap the trigger border to a danger tone when the field is invalid. */
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const summary = district ? (region ? `${region} · ${district}` : district) : region ?? "";

  return (
    <div className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>}
      {name && <input type="hidden" name={name} value={district ?? ""} />}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-2xl bg-surface-50 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2",
          error
            ? "border border-danger hover:border-danger focus-visible:ring-danger/30"
            : "border border-surface-200 hover:border-brand-300 focus-visible:ring-brand-100"
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <MapPin size={15} />
          </span>
          <span className={cn("truncate", summary ? "text-ink-900" : "text-ink-400")}>{summary || placeholder}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-400" />
      </button>

      <RegionDistrictSheet
        open={open}
        onClose={() => setOpen(false)}
        selected={{ region, district }}
        onSelect={onSelect}
      />
    </div>
  );
}
