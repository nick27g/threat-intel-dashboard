export function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 rounded-xl bg-zinc-800 border border-zinc-700" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-zinc-800 border border-zinc-700" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-zinc-800 border border-zinc-700" />
        <div className="h-64 rounded-xl bg-zinc-800 border border-zinc-700" />
      </div>
    </div>
  );
}
