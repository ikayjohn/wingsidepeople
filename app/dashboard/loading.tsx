export default function DashboardLoading() {
  return (
    <div className="animate-pulse px-4 py-6 sm:px-0">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <div className="h-3 w-28 rounded bg-gray-200" />
        <div className="mt-3 h-8 w-72 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded bg-gray-100" />
        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-gray-100" />
          ))}
        </div>
      </div>

      <div className="mb-6 h-56 w-full rounded-2xl border border-gray-200 bg-gray-100 sm:h-64" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <section key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="h-6 w-40 rounded bg-gray-200" />
              <div className="mt-4 space-y-3">
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-5/6 rounded bg-gray-100" />
                <div className="h-4 w-2/3 rounded bg-gray-100" />
              </div>
            </section>
          ))}
        </div>
        <aside className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <section key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="h-6 w-32 rounded bg-gray-200" />
              <div className="mt-4 space-y-3">
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-4/5 rounded bg-gray-100" />
              </div>
            </section>
          ))}
        </aside>
      </div>
    </div>
  )
}
