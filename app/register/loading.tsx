export default function RegisterLoading() {
  return (
    <div className="h-screen bg-gray-50 lg:grid lg:grid-cols-2">
      <div className="hidden h-screen animate-pulse bg-gray-100 lg:block" />
      <div className="h-screen overflow-y-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[36.5rem] animate-pulse space-y-8">
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-gray-200" />
            <div className="mt-4 h-8 w-64 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-100" />
          </div>

          <div className="space-y-4 rounded-md">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-28 rounded bg-gray-200" />
                <div className="h-10 w-full rounded-md bg-gray-100" />
              </div>
            ))}
            <div className="h-10 w-full rounded-md bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}
