export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <div className="animate-pulse space-y-3">
        <div className="h-7 w-48 rounded bg-line/60" />
        <div className="h-24 rounded-lg bg-line/40" />
        <div className="h-40 rounded-lg bg-line/30" />
      </div>
    </div>
  );
}
