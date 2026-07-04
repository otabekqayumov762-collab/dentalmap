import { CalendarDays, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { weekdayLabel } from "../../api/dentalMapApi";
import type { ApiWeeklyAvailability } from "../../types";
import { Button, Card, Chip, cn, Field, IconButton } from "../../ui";
import { GroupLabel, SectionHeader } from "./common";

const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;
const defaultSlotDurationMinutes = "30";

function rangesForDay(schedule: ApiWeeklyAvailability[], weekday: number) {
  return schedule
    .filter((item) => item.weekday === weekday)
    .sort((left, right) => left.start_time.localeCompare(right.start_time));
}

/** "{count} oraliq · {earliestStart}–{latestEnd}" envelope summary for a collapsed day row. */
function daySummary(ranges: ApiWeeklyAvailability[]) {
  if (ranges.length === 0) {
    return null;
  }
  const latestEnd = ranges.reduce((max, item) => (item.end_time > max ? item.end_time : max), ranges[0].end_time);
  return `${ranges.length} oraliq: ${ranges[0].start_time.slice(0, 5)}-${latestEnd.slice(0, 5)}`;
}

function toMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.slice(0, 5).split(":");
  return Number(hours) * 60 + Number(minutes);
}

function fromMinutes(value: number) {
  const clamped = Math.max(0, Math.min(value, 23 * 60 + 59));
  const hours = String(Math.floor(clamped / 60)).padStart(2, "0");
  const minutes = String(clamped % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function draftForRanges(ranges: ApiWeeklyAvailability[]) {
  if (ranges.length === 0) {
    return { start: "09:00", end: "13:00" };
  }
  const latestEnd = ranges.reduce((max, item) => Math.max(max, toMinutes(item.end_time)), 0);
  const start = Math.min(latestEnd, 23 * 60);
  const end = Math.max(Math.min(start + 180, 23 * 60 + 59), start + 30);
  return { start: fromMinutes(start), end: fromMinutes(end) };
}

export function DoctorScheduleManager({
  schedule,
  loading,
  onScheduleSubmit,
  onScheduleDelete
}: {
  schedule: ApiWeeklyAvailability[];
  loading: boolean;
  onScheduleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  onScheduleDelete?: (item: ApiWeeklyAvailability) => Promise<void> | void;
}) {
  const [openDay, setOpenDay] = useState<number | null>(null);

  const grouped = useMemo(
    () => weekdays.map((weekday) => ({ weekday, ranges: rangesForDay(schedule, weekday) })),
    [schedule]
  );

  return (
    <Card as="section" className="flex flex-col gap-5">
      <SectionHeader Icon={CalendarDays} title="Ish jadvali" subtitle="Bemorlar shu vaqtlardan tanlaydi" />

      <div className="flex flex-col gap-2">
        {grouped.map((group) => (
          <DayRow
            key={group.weekday}
            weekday={group.weekday}
            ranges={group.ranges}
            open={openDay === group.weekday}
            loading={loading}
            onToggle={() => setOpenDay((current) => (current === group.weekday ? null : group.weekday))}
            onOpen={() => setOpenDay(group.weekday)}
            onClose={() => setOpenDay(null)}
            onScheduleSubmit={onScheduleSubmit}
            onScheduleDelete={onScheduleDelete}
          />
        ))}
      </div>
    </Card>
  );
}

/** Single weekday accordion row: collapsed summary + expanded chip list & add-range form. */
function DayRow({
  weekday,
  ranges,
  open,
  loading,
  onToggle,
  onOpen,
  onClose,
  onScheduleSubmit,
  onScheduleDelete
}: {
  weekday: number;
  ranges: ApiWeeklyAvailability[];
  open: boolean;
  loading: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
  onScheduleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  onScheduleDelete?: (item: ApiWeeklyAvailability) => Promise<void> | void;
}) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");

  useEffect(() => {
    if (open) {
      const draft = draftForRanges(ranges);
      setStartTime(draft.start);
      setEndTime(draft.end);
    }
  }, [open, ranges]);

  const summary = daySummary(ranges);
  const panelId = `schedule-day-${weekday}`;
  const canSubmit = endTime > startTime;
  const isWorkday = ranges.length > 0;
  const enabled = isWorkday || open;

  async function handleWorkdayToggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (loading) {
      return;
    }
    if (!enabled) {
      onOpen();
      return;
    }
    if (ranges.length > 0 && onScheduleDelete) {
      for (const item of ranges) {
        await onScheduleDelete(item);
      }
    }
    onClose();
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-colors",
        enabled ? "border-brand-100 bg-surface-0" : "border-surface-100 bg-surface-50"
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink-900">{weekdayLabel(weekday)}</span>
            <span className={cn("block text-xs", summary ? "text-ink-500" : open ? "text-brand-600" : "text-ink-400")}>
              {summary ?? (open ? "Yangi vaqt qo'shing" : "Dam olish")}
            </span>
          </span>
          <ChevronDown size={18} className={cn("shrink-0 text-ink-400 transition-transform", open && "rotate-180")} />
        </button>

        <button
          type="button"
          aria-pressed={enabled}
          aria-label={`${weekdayLabel(weekday)} ${enabled ? "dam olish kuni qilish" : "ish kuni qilish"}`}
          disabled={loading || (enabled && ranges.length > 0 && !onScheduleDelete)}
          onClick={handleWorkdayToggle}
          className={cn(
            "relative h-8 w-14 shrink-0 rounded-pill border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50",
            enabled ? "border-brand-500 bg-brand-500" : "border-surface-200 bg-surface-200"
          )}
        >
          <span
            className={cn(
              "absolute left-1 top-1 size-6 rounded-full bg-white shadow-sm transition-transform",
              enabled ? "translate-x-6" : "translate-x-0"
            )}
          />
        </button>
      </div>

      <div
        id={panelId}
        className={cn(
          "grid border-t border-surface-100 transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 px-3.5 pb-3.5 pt-3">
            {ranges.length > 0 && (
              <div>
                <GroupLabel>Kiritilgan vaqtlar</GroupLabel>
                <div className="flex flex-wrap gap-2">
                  {ranges.map((item) => (
                    <div key={item.id} className="inline-flex items-center gap-1">
                      <Chip>
                        {item.start_time.slice(0, 5)}-{item.end_time.slice(0, 5)}
                      </Chip>
                      {onScheduleDelete && (
                        <IconButton
                          type="button"
                          variant="ghost"
                          aria-label={`${weekdayLabel(weekday)} ${item.start_time.slice(0, 5)}-${item.end_time.slice(0, 5)} oralig'ini o'chirish`}
                          disabled={loading}
                          onClick={() => onScheduleDelete(item)}
                          className="-ml-2 size-8 text-ink-400 hover:bg-rose-50 hover:text-danger"
                        >
                          <X size={16} />
                        </IconButton>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <GroupLabel>Yangi oraliq</GroupLabel>
              <form onSubmit={onScheduleSubmit} className="flex flex-col gap-3">
                <input type="hidden" name="weekday" value={weekday} readOnly />
                <input type="hidden" name="slot_duration_minutes" value={defaultSlotDurationMinutes} readOnly />

                <fieldset disabled={loading} className="flex flex-col gap-3 border-0 p-0 disabled:opacity-60">
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      name="start_time"
                      label="Boshlanishi"
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                    <Field
                      name="end_time"
                      label="Tugashi"
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </div>

                  <Button type="submit" size="md" disabled={loading || !canSubmit}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {loading ? "Saqlanmoqda" : "Oraliq qo'shish"}
                  </Button>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
