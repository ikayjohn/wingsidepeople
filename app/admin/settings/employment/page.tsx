import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { canAccessAdminSection } from "@/lib/rbac"
import { getEmploymentDefaults } from "@/lib/admin-settings"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { SectionCard, StatCard } from "@/components/ModuleCards"
import { updateEmploymentDefaults } from "@/app/admin/settings/actions"

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
]

export default async function AdminEmploymentDefaultsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "settings")) redirect("/admin")
  if (!hasPrismaDelegates("employmentDefaults")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Employment defaults runtime reload required" />
      </div>
    )
  }

  const defaults = await getEmploymentDefaults()

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Settings</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">Employment Defaults</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Set the standard employment assumptions used for new staff records and HR configuration baselines.
            </p>
          </div>
          <Link href="/admin/settings" className="text-sm font-medium text-brand-brown hover:text-brand-brown-light">
            Back to settings
          </Link>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Leave Allowance" value={`${defaults.defaultAnnualLeaveAllowance} days`} tone="green" />
        <StatCard label="Work Week" value={`${defaults.standardWorkWeekDays} days`} tone="blue" />
        <StatCard label="Daily Hours" value={`${defaults.standardWorkHoursPerDay} hrs`} tone="amber" />
        <StatCard label="Probation" value={`${defaults.defaultProbationMonths} months`} tone="slate" />
      </section>

      <SectionCard title="Default Employment Rules" description="New registrations inherit these defaults unless HR updates them later.">
        <form action={updateEmploymentDefaults} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="defaultEmploymentType" className="block text-sm font-medium text-gray-700">
                Default Employment Type
              </label>
              <select id="defaultEmploymentType" name="defaultEmploymentType" defaultValue={defaults.defaultEmploymentType} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900">
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="defaultAnnualLeaveAllowance" className="block text-sm font-medium text-gray-700">
                Annual Leave Allowance
              </label>
              <input id="defaultAnnualLeaveAllowance" name="defaultAnnualLeaveAllowance" type="number" min="0" max="365" defaultValue={defaults.defaultAnnualLeaveAllowance} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="standardWorkWeekDays" className="block text-sm font-medium text-gray-700">
                Standard Work Week
              </label>
              <input id="standardWorkWeekDays" name="standardWorkWeekDays" type="number" min="1" max="7" defaultValue={defaults.standardWorkWeekDays} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label htmlFor="standardWorkHoursPerDay" className="block text-sm font-medium text-gray-700">
                Standard Hours Per Day
              </label>
              <input id="standardWorkHoursPerDay" name="standardWorkHoursPerDay" type="number" min="1" max="24" defaultValue={defaults.standardWorkHoursPerDay} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label htmlFor="defaultProbationMonths" className="block text-sm font-medium text-gray-700">
                Default Probation
              </label>
              <input id="defaultProbationMonths" name="defaultProbationMonths" type="number" min="0" max="24" defaultValue={defaults.defaultProbationMonths} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>

          <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">
            Save employment defaults
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
