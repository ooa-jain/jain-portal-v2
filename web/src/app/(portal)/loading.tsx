/** Shown inside the portal (menu and tabs stay) while a page's data loads. */
export default function PortalLoading() {
  const bar = "animate-pulse rounded-md bg-secondary";
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className="flex flex-col gap-4">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-2">
        <span className={`${bar} h-3 w-40`} />
        <span className={`${bar} h-7 w-72`} />
        <span className={`${bar} h-3 w-96 max-w-full`} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <span className={`${bar} h-3 w-24`} />
            <span className={`${bar} h-7 w-12`} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <span className={`${bar} h-4 w-48`} />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`${bar} h-9 w-full`} />
        ))}
      </div>
    </div>
  );
}
