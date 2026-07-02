import { CalendarDays, Clock, Plus, Trash2 } from "lucide-react";
import { useMemo, type FormEvent } from "react";
import { weekdayLabel } from "../../api/dentalMapApi";
import type { ApiWeeklyAvailability } from "../../types";
import { Button, Card, Field, IconButton } from "../../ui";
import { GroupLabel, NativeSelect, SectionHeader } from "./common";

const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;

/** Group ranges by weekday, keeping only days that have at least one range. */
function groupByWeekday(schedule: ApiWeeklyAvailability[]) {
  return weekdays
    .map((weekday) => ({
      weekday,
      ranges: schedule
        .filter((item) => item.weekday === weekday)
        .sort((left, right) => left.start_time.localeCompare(right.start_time))
    }))
    .filter((group) => group.ranges.length > 0);
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
  const groups = useMemo(() => groupByWeekday(schedule), [schedule]);

  return (
    <Card as="section" className="flex flex-col gap-5">
      <SectionHeader
        Icon={CalendarDays}
        title="Haftalik bo'sh vaqtlar"
        subtitle="Bemorlar shu vaqtlardan tanlaydi"
      />

      {/* Existing ranges, grouped by weekday */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-surface-200 bg-surface-50 px-4 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-surface-100 text-ink-400">
            <Clock size={20} />
          </span>
          <span className="text-sm font-medium text-ink-500">Hali vaqt qo&apos;shilmagan</span>
          <span className="text-xs text-ink-400">Quyida birinchi bo&apos;sh oralig&apos;ingizni qo&apos;shing</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.weekday}>
              <GroupLabel>{weekdayLabel(group.weekday)}</GroupLabel>
              <ul className="flex flex-col gap-2">
                {group.ranges.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-surface-100 bg-surface-50 px-3 py-2.5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Clock size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold tabular-nums text-ink-900">
                        {item.start_time.slice(0, 5)}-{item.end_time.slice(0, 5)}
                        <span className="font-normal text-ink-500"> · {item.slot_duration_minutes} daqiqa</span>
                      </span>
                      {item.note && <span className="mt-0.5 block truncate text-xs text-ink-400">{item.note}</span>}
                    </div>
                    {onScheduleDelete && (
                      <IconButton
                        type="button"
                        variant="ghost"
                        aria-label="Oralig'ni o'chirish"
                        disabled={loading}
                        onClick={() => onScheduleDelete(item)}
                        className="shrink-0 text-ink-400 hover:bg-rose-50 hover:text-danger"
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={onScheduleSubmit} className="flex flex-col gap-4 border-t border-surface-100 pt-4">
        <div>
          <GroupLabel>Yangi oraliq qo&apos;shish</GroupLabel>
          <p className="rounded-2xl bg-brand-50 px-3.5 py-2.5 text-xs leading-relaxed text-brand-700">
            Bir kun uchun bir nechta oraliq qo&apos;shishingiz mumkin — masalan, 09:00-11:00 va 15:00-17:00.
          </p>
        </div>

        <fieldset disabled={loading} className="flex min-w-0 flex-col gap-4 border-0 p-0 disabled:opacity-60">
          <NativeSelect name="weekday" label="Kun" defaultValue="0">
            {weekdays.map((day) => (
              <option key={day} value={day}>
                {weekdayLabel(day)}
              </option>
            ))}
          </NativeSelect>

          <div className="grid grid-cols-2 gap-3">
            <Field name="start_time" label="Boshlanishi" type="time" defaultValue="09:00" />
            <Field name="end_time" label="Tugashi" type="time" defaultValue="18:00" />
          </div>

          <Field
            name="slot_duration_minutes"
            label="Qabul davomiyligi (daqiqa)"
            hint="Har bir bemorga ajratiladigan vaqt"
            type="number"
            min={5}
            max={240}
            defaultValue="30"
          />

          <Field name="note" label="Izoh (ixtiyoriy)" placeholder="Masalan: faqat tekshiruv" />

          <Button type="submit" size="lg" disabled={loading}>
            <Plus size={18} />
            {loading ? "Saqlanmoqda..." : "Vaqt oralig'i qo'shish"}
          </Button>
        </fieldset>
      </form>
    </Card>
  );
}
