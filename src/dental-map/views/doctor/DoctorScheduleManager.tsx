import { CalendarDays, ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { weekdayLabel } from "../../api/dentalMapApi";
import type { ApiWeeklyAvailability } from "../../types";
import { Button, Card, Chip, cn, Field, IconButton, Select } from "../../ui";
import { GroupLabel, SectionHeader } from "./common";

const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;
const durationOptions = [15, 20, 30, 45, 60] as const;

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
  return `${ranges.length} oraliq · ${ranges[0].start_time.slice(0, 5)}–${latestEnd.slice(0, 5)}`;
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
  const [duration, setDuration] = useState("30");

  const grouped = useMemo(
    () => weekdays.map((weekday) => ({ weekday, ranges: rangesForDay(schedule, weekday) })),
    [schedule]
  );

  return (
    <Card as="section" className="flex flex-col gap-5">
      <SectionHeader Icon={CalendarDays} title="Ish jadvali" subtitle="Bemorlar shu vaqtlardan tanlaydi" />

      <Select
        label="Qabul davomiyligi"
        value={duration}
        onChange={setDuration}
        options={durationOptions.map((minutes) => ({ value: String(minutes), label: `${minutes} daqiqa` }))}
      />

      <p className="rounded-2xl bg-brand-50 px-3.5 py-2.5 text-xs leading-relaxed text-brand-700">
        Bir kun uchun bir nechta oraliq qo&apos;shing (masalan 09:00–13:00 va 15:00–18:00). Har oraliq avtomatik qabul
        vaqtlariga bo&apos;linadi.
      </p>

      <div className="flex flex-col gap-2">
        {grouped.map((group) => (
          <DayRow
            key={group.weekday}
            weekday={group.weekday}
            ranges={group.ranges}
            open={openDay === group.weekday}
            loading={loading}
            duration={duration}
            onToggle={() => setOpenDay((current) => (current === group.weekday ? null : group.weekday))}
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
  duration,
  onToggle,
  onScheduleSubmit,
  onScheduleDelete
}: {
  weekday: number;
  ranges: ApiWeeklyAvailability[];
  open: boolean;
  loading: boolean;
  duration: string;
  onToggle: () => void;
  onScheduleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  onScheduleDelete?: (item: ApiWeeklyAvailability) => Promise<void> | void;
}) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [showNote, setShowNote] = useState(false);

  // Fresh draft every time this day is (re)opened, so a stale range from a
  // previously open day never leaks into a different day's submission.
  useEffect(() => {
    if (open) {
      setStartTime("09:00");
      setEndTime("13:00");
      setShowNote(false);
    }
  }, [open]);

  const summary = daySummary(ranges);
  const panelId = `schedule-day-${weekday}`;
  const canSubmit = endTime > startTime;

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-100 bg-surface-50">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-100"
      >
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink-900">{weekdayLabel(weekday)}</span>
          <span className={cn("block text-xs", summary ? "text-ink-500" : "text-ink-400")}>
            {summary ?? "Dam olish"}
          </span>
        </div>
        <ChevronDown size={18} className={cn("shrink-0 text-ink-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={panelId} className="flex flex-col gap-3 border-t border-surface-100 px-3.5 pb-3.5 pt-3">
          {ranges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ranges.map((item) => (
                <div key={item.id} className="inline-flex items-center gap-1">
                  <Chip>
                    {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
                  </Chip>
                  {onScheduleDelete && (
                    <IconButton
                      type="button"
                      variant="ghost"
                      aria-label={`${weekdayLabel(weekday)} ${item.start_time.slice(0, 5)}-${item.end_time.slice(0, 5)} oralig'ini o'chirish`}
                      disabled={loading}
                      onClick={() => onScheduleDelete(item)}
                      className="-ml-2 size-7 text-ink-400 hover:bg-rose-50 hover:text-danger"
                    >
                      <X size={14} />
                    </IconButton>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <GroupLabel>Yangi oraliq</GroupLabel>
            <form onSubmit={onScheduleSubmit} className="flex flex-col gap-3">
              <input type="hidden" name="weekday" value={weekday} readOnly />
              <input type="hidden" name="slot_duration_minutes" value={duration} readOnly />

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

                {showNote ? (
                  <Field name="note" label="Izoh (ixtiyoriy)" placeholder="Masalan: faqat tekshiruv" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNote(true)}
                    className="self-start text-xs font-medium text-brand-600 hover:underline"
                  >
                    + izoh qo&apos;shish
                  </button>
                )}

                <Button type="submit" size="md" disabled={loading || !canSubmit}>
                  <Plus size={16} />
                  Qo&apos;shish
                </Button>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
