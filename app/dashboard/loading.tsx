export default function DashboardLoading() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="mt-2 h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse mb-2"></div>
        ))}
      </div>
    </div>
  )
}
