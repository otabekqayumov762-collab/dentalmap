"use client";

import { Check, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { regionDistricts, regions } from "../catalog";
import { cn } from "./cn";
import {
  ControlLabel,
  controlHeight,
  controlTriggerBase,
  controlTriggerDanger,
  controlTriggerIdle,
  errorTextClass
} from "./Field";
import { Sheet } from "./Sheet";

export type RegionDistrictSelection = { region: string | null; district: string | null };

const rowBase =
  "flex items-center justify-between gap-3 rounded-card border px-4 py-3 text-left text-sm transition-colors";
// bg-control, not bg-surface-0: the sheet itself is surface-0, so a row drawn
// on it measured 1.00:1 and the list read as unmarked text with no rows at all.
const rowIdle = "border-control-border bg-control text-ink-700 hover:border-brand-400";
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
  selected,
  mode = "filter"
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: RegionDistrictSelection) => void;
  selected?: RegionDistrictSelection;
  /**
   * "filter" (Home discovery): "all" is valid — keep the "Barcha hududlar" and
   * per-region "Barchasi" shortcuts. "select" (data collection: profile / user
   * registration / clinic location): "all" is meaningless — hide both shortcuts
   * so a concrete region AND district must be picked.
   */
  mode?: "filter" | "select";
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
        <div className="flex flex-col gap-1.5" role="group" aria-label="Hududlar">
          {mode === "filter" && (
            <button
              type="button"
              aria-pressed={isAllSelected}
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
          )}

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
        <div className="flex flex-col gap-1.5" role="group" aria-label={activeRegion ?? "Tumanlar"}>
          <button
            type="button"
            onClick={() => setPage("regions")}
            className="mb-1 inline-flex w-fit items-center gap-1 rounded-pill px-2.5 py-1.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
          >
            <ChevronLeft size={16} />
            Orqaga
          </button>

          {mode === "filter" && (
            <button
              type="button"
              aria-pressed={selected?.region === activeRegion && !selected?.district}
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
          )}

          {(activeRegion ? regionDistricts[activeRegion] ?? [] : []).map((district) => {
            const active = selected?.district === district;

            return (
              <button
                key={district}
                type="button"
                aria-pressed={active}
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
  error,
  errorText,
  mode = "filter"
}: {
  name?: string;
  label?: ReactNode;
  region: string | null;
  district: string | null;
  onSelect: (selection: RegionDistrictSelection) => void;
  placeholder?: string;
  /** Swap the trigger border to a danger tone when the field is invalid. */
  error?: boolean;
  /** Message rendered under the trigger. */
  errorText?: ReactNode;
  /** "filter" keeps the "Barcha hududlar"/"Barchasi" shortcuts (Home); "select"
   *  removes them so a concrete region+district must be picked (data collection). */
  mode?: "filter" | "select";
}) {
  const [open, setOpen] = useState(false);
  const invalid = Boolean(error || errorText);
  // A field labelled "Tuman" should prioritise the selected district. Showing
  // both region and district clipped the useful part on narrow Telegram views.
  const summary = mode === "select"
    ? district ?? region ?? ""
    : district
      ? (region ? `${region} · ${district}` : district)
      : region ?? "";

  return (
    <div className="block">
      {label && <ControlLabel>{label}</ControlLabel>}
      {name && <input type="hidden" name={name} value={district ?? ""} />}
      <button
        type="button"
        onClick={() => setOpen(true)}
        // No aria-invalid: it is not supported on the implicit button role.
        // The danger border plus the role="alert" message below carry the state.
        className={cn(
          controlTriggerBase,
          controlHeight,
          invalid ? controlTriggerDanger : controlTriggerIdle
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
      {errorText && (
        <small className={errorTextClass} role="alert">
          {errorText}
        </small>
      )}

      <RegionDistrictSheet
        open={open}
        onClose={() => setOpen(false)}
        selected={{ region, district }}
        onSelect={onSelect}
        mode={mode}
      />
    </div>
  );
}
