import { CalendarDays, Clock, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { weekdayLabel } from "../../api/dentalMapApi";
import type { ApiWeeklyAvailability } from "../../types";
import { Badge, Button, Card, Field, IconButton } from "../../ui";
import { NativeSelect, SectionHeader } from "./common";

const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;

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
  return (
    <Card as="section" className="flex flex-col gap-5">
      <SectionHeader
        Icon={CalendarDays}
        title="Haftalik bo'sh vaqtlar"
        subtitle="Bemorlar shu vaqtlardan tanlaydi"
      />

      {/* Existing slots */}
      {schedule.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-surface-200 bg-surface-50 px-4 py-5 text-ink-500">
          <Clock size={18} className="shrink-0 text-ink-400" />
          <span className="text-sm">Hali vaqt qo&apos;shilmagan</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {schedule.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-surface-100 bg-surface-50 px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm font-bold text-ink-900">{weekdayLabel(item.weekday)}</strong>
                  <Badge tone={item.is_active ? "success" : "neutral"}>
                    {item.is_active ? "Faol" : "O'chirilgan"}
                  </Badge>
                </div>
                <span className="mt-0.5 block text-xs text-ink-500">
                  {item.start_time.slice(0, 5)}-{item.end_time.slice(0, 5)} · {item.slot_duration_minutes} daqiqa
                </span>
                {item.note && <span className="mt-0.5 block truncate text-xs text-ink-400">{item.note}</span>}
              </div>
              {onScheduleDelete && (
                <IconButton
                  type="button"
                  variant="ghost"
                  aria-label="Vaqtni o'chirish"
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
      )}

      {/* Add form */}
      <form onSubmit={onScheduleSubmit} className="flex flex-col gap-4 border-t border-surface-100 pt-4">
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
          type="number"
          min={5}
          max={240}
          defaultValue="30"
        />

        <Field name="note" label="Izoh (ixtiyoriy)" placeholder="Masalan: faqat tekshiruv" />

        <Button type="submit" disabled={loading}>
          <Plus size={18} />
          {loading ? "Saqlanmoqda..." : "Jadval qo'shish"}
        </Button>
      </form>
    </Card>
  );
}
