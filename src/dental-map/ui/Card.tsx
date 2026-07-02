import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "article" | "section";
  interactive?: boolean;
  children: ReactNode;
};

export function Card({ as = "div", interactive = false, className, children, ...rest }: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "rounded-card bg-surface-0 shadow-card border border-surface-100 p-4",
        interactive && "transition-transform hover:-translate-y-0.5 cursor-pointer",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
