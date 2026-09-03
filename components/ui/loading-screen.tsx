export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate/30 border-t-slate motion-reduce:animate-none" />
      <p className="text-sm text-ink/60">{label}</p>
    </div>
  );
}
