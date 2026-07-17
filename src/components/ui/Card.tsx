import { cn } from "@/lib/utils";

/** Rounded, subtly shadowed surface used everywhere in the dashboard. */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-[var(--surface)] border-[var(--border)] shadow-card",
        "transition-shadow duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
