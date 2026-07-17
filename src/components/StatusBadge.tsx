import { cn } from "@/lib/utils";

/** Online/Offline pill with a live pulse ring when online. */
export function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        online
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          online ? "bg-status-online animate-pulse-ring" : "bg-status-offline",
        )}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}
