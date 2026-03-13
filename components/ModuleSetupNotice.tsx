export default function ModuleSetupNotice({
  title = "Feature setup pending",
  description,
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <p className="text-sm font-semibold text-amber-900">{title}</p>
      <p className="mt-1 text-sm text-amber-800">
        {description || "This module depends on new HR tables and Prisma delegates. If migration and generate already ran, restart the app process so it loads the regenerated Prisma client."}
      </p>
    </div>
  )
}
