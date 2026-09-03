const chipBase = "rounded-full px-3 py-1 text-sm font-medium capitalize";

/** Static label (optionally with an amount) — e.g. a category total on the trip dashboard. */
export function CategoryChip({ label, value }: { label: string; value?: string }) {
  return (
    <span
      className={`${chipBase} shadow-raised-cream inline-flex items-center gap-1.5 bg-cream text-ink`}
    >
      {label}
      {value && <span className="tabular-nums text-ink/70">{value}</span>}
    </span>
  );
}

/** Toggleable filter — pressed shadow marks the active one. */
export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${chipBase} transition-press bg-base ${
        active ? "shadow-pressed text-slate" : "shadow-raised text-ink"
      }`}
    >
      {label}
    </button>
  );
}
