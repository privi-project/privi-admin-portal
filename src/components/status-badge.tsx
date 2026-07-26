import { formatStatusLabel, toneForStatus } from "@/lib/status";

const TONE_CLASSES: Record<string, string> = {
  success: "bg-teal/10 text-status-success border-status-success/30",
  warning: "bg-note-bg text-status-warning border-status-warning/30",
  danger: "bg-status-danger/10 text-status-danger border-status-danger/30",
  neutral: "bg-border-hairline-2 text-muted-dark border-border-hairline",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = toneForStatus(status);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
