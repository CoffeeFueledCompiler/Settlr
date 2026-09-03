export function StatBlock({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink/60">{label}</p>
      <p className="font-display text-3xl font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}
