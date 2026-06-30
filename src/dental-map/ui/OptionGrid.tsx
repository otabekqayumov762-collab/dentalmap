import { Check } from "lucide-react";
import { cn } from "./cn";

export type Option = { value: string; label: string };

type BaseProps = {
  options: Option[];
  /** Hidden input name for FormData submission (single: value, multi: comma-joined). */
  name?: string;
  className?: string;
};

type SingleProps = BaseProps & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
};

type MultiProps = BaseProps & {
  multiple: true;
  value: string[];
  onChange: (value: string) => void;
};

export type OptionGridProps = SingleProps | MultiProps;

/**
 * Neat, uniform 2-column grid of selectable options — replaces ragged chip wraps
 * for specialty / service pickers on mobile. Single- or multi-select.
 */
export function OptionGrid(props: OptionGridProps) {
  const { options, name, className } = props;
  const selected = props.multiple ? props.value : [props.value];
  const hiddenValue = props.multiple ? props.value.join(",") : props.value;

  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)}>
      {name && <input type="hidden" name={name} value={hiddenValue} />}
      {options.map((option) => {
        const active = selected.includes(option.value);

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => props.onChange(option.value)}
            className={cn(
              "flex min-h-12 items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.98]",
              active
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-surface-200 bg-surface-0 text-ink-600 hover:border-brand-300"
            )}
          >
            <span className="min-w-0 leading-tight">{option.label}</span>
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                active ? "border-brand-500 bg-brand-500 text-white" : "border-surface-200 text-transparent"
              )}
            >
              <Check size={13} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
