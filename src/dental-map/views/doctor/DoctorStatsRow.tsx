import { CalendarCheck2, CheckCircle2, Clock, Star, type LucideIcon } from "lucide-react";
import { Card } from "../../ui";

type StatTileProps = {
  Icon: LucideIcon;
  value: number | string;
  label: string;
  sublabel?: string;
};

/** One rounded stat tile: soft icon square + big number + small Uzbek label. */
function StatTile({ Icon, value, label, sublabel }: StatTileProps) {
  return (
    <Card className="flex h-full items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="block truncate text-2xl font-extrabold leading-none tabular-nums text-ink-900">
          {value}
        </strong>
        <small className="block truncate text-xs font-medium leading-tight text-ink-500">{label}</small>
        {sublabel && <small className="block truncate text-[0.7rem] leading-tight text-ink-400">{sublabel}</small>}
      </span>
    </Card>
  );
}

export function DoctorStatsRow({
  pendingCount,
  confirmedCount,
  completedCount,
  rating,
  reviewsCount
}: {
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  rating: number | string;
  reviewsCount: number;
}) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3">
      <StatTile Icon={Clock} value={pendingCount} label="Yangi so'rovlar" />
      <StatTile Icon={CheckCircle2} value={confirmedCount} label="Tasdiqlangan" />
      <StatTile Icon={CalendarCheck2} value={completedCount} label="Yakunlangan" />
      <StatTile Icon={Star} value={rating} label="Reyting" sublabel={`${reviewsCount} sharh`} />
    </div>
  );
}
