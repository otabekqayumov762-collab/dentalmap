import { Check } from "lucide-react";
import { cn } from "./cn";

export type Option = { value: string; label: string };

type BaseProps = {
  options: Option[];
  /** Hidden input name for FormData submission (single: value, multi: comma-joined). */
  name?: string;
  className?: string;
  /** Wrap the grid in a danger ring when the field is invalid (matches the wizard's error convention). */
  error?: boolean;
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
 * Compact 2-column grid of selectable options. The selection indicator sits in
 * the corner (absolute) so the label keeps the full card width — readable even
 * for long labels on narrow phones, without the list getting too tall.
 */
export function OptionGrid(props: OptionGridProps) {
  const { options, name, className, error } = props;
  const selected = props.multiple ? props.value : [props.value];
  const hiddenValue = props.multiple ? props.value.join(",") : props.value;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2.5",
        error && "rounded-2xl p-1 ring-1 ring-danger",
        className
      )}
    >
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
              "relative flex min-h-12 items-center justify-center rounded-2xl border px-3 py-2.5 text-center text-sm font-medium leading-tight transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.98]",
              active
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-surface-200 bg-surface-0 text-ink-600 hover:border-brand-300"
            )}
          >
            <span className="px-1">{option.label}</span>
            {active && <Check size={14} className="absolute right-2 top-2 text-brand-500" />}
          </button>
        );
      })}
    </div>
  );
}
