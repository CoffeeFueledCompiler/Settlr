// Muted tones that sit alongside the slate accent without competing with it.
const PALETTE = ["#6D8196", "#8C7A6B", "#7A8C6D", "#8C6D85", "#6D7A8C", "#A68A64"];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Same person always gets the same colour — pass a stable `seed` (user id) where available. */
export function Avatar({
  name,
  seed,
  size = 36,
}: {
  name: string;
  seed?: string;
  size?: number;
}) {
  return (
    <div
      className="shadow-raised flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: colorFor(seed ?? name),
        fontSize: size * 0.36,
      }}
      title={name}
    >
      {initialsFor(name)}
    </div>
  );
}
