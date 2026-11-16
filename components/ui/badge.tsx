import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  default: "bg-secondary text-secondary-foreground",
  NEW: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-sky-100 text-sky-800",
  QUALIFIED: "bg-violet-100 text-violet-800",
  PROPOSAL_SENT: "bg-amber-100 text-amber-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-rose-100 text-rose-800",
  HOT: "bg-rose-100 text-rose-800",
  WARM: "bg-amber-100 text-amber-800",
  COLD: "bg-sky-100 text-sky-800",
};

export function Badge({ className, tone = "default", ...props }: React.ComponentProps<"span"> & { tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone] ?? tones.default,
        className,
      )}
      {...props}
    />
  );
}
