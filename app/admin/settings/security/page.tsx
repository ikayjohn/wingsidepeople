import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { canAccessAdminSection } from "@/lib/rbac"
import { getEmployeeIdExample, getSecurityAccessRules } from "@/lib/admin-settings"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { SectionCard, StatCard } from "@/components/ModuleCards"
import { updateSecurityAccessRules } from "@/app/admin/settings/actions"

export default async function AdminSecurityAccessRulesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "settings")) redirect("/admin")
  if (!hasPrismaDelegates("securityAccessRule")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Security access rules runtime reload required" />
      </div>
    )
  }

  const rules = await getSecurityAccessRules()
  const allowlistCount = rules.adminIpAllowlist
    ? rules.adminIpAllowlist.split(/[\n,]+/).map((value: string) => value.trim()).filter(Boolean).length
    : 0

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Settings</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">Security &amp; Access Rules</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Control self-service signup requirements and the access guardrails used by admin endpoints.
            </p>
          </div>
          <Link href="/admin/settings" className="text-sm font-medium text-brand-brown hover:text-brand-brown-light">
            Back to settings
          </Link>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Registration" value={rules.allowSelfServiceRegistration ? "Enabled" : "Disabled"} tone={rules.allowSelfServiceRegistration ? "green" : "rose"} />
        <StatCard label="Email Domain" value={rules.allowedEmailDomain} tone="blue" />
        <StatCard label="Employee ID" value={getEmployeeIdExample(rules.employeeIdPrefix, rules.employeeIdDigits)} tone="amber" />
        <StatCard label="Admin Allowlist" value={rules.enforceAdminIpAllowlist ? `${allowlistCount} IPs` : "Off"} tone="slate" />
      </section>

      <SectionCard title="Signup Rules" description="These values are enforced on the employee registration form and API.">
        <form action={updateSecurityAccessRules} className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <input
              id="allowSelfServiceRegistration"
              name="allowSelfServiceRegistration"
              type="checkbox"
              defaultChecked={rules.allowSelfServiceRegistration}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-brown focus:ring-brand-gold"
            />
            <div>
              <label htmlFor="allowSelfServiceRegistration" className="text-sm font-medium text-gray-900">
                Allow self-service registration
              </label>
              <p className="text-xs text-gray-500">
                Turn this off if accounts should only be provisioned internally by HR or admins.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="allowedEmailDomain" className="block text-sm font-medium text-gray-700">
                Allowed Email Domain
              </label>
              <input id="allowedEmailDomain" name="allowedEmailDomain" defaultValue={rules.allowedEmailDomain} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label htmlFor="employeeIdPrefix" className="block text-sm font-medium text-gray-700">
                Employee ID Prefix
              </label>
              <input id="employeeIdPrefix" name="employeeIdPrefix" defaultValue={rules.employeeIdPrefix} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase text-gray-900" />
            </div>
            <div>
              <label htmlFor="employeeIdDigits" className="block text-sm font-medium text-gray-700">
                Employee ID Digits
              </label>
              <input id="employeeIdDigits" name="employeeIdDigits" type="number" min="2" max="8" defaultValue={rules.employeeIdDigits} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="passwordMinLength" className="block text-sm font-medium text-gray-700">
                Minimum Password Length
              </label>
              <input id="passwordMinLength" name="passwordMinLength" type="number" min="8" max="64" defaultValue={rules.passwordMinLength} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600">
              Registration IDs will use <span className="font-semibold text-gray-900">{getEmployeeIdExample(rules.employeeIdPrefix, rules.employeeIdDigits)}</span> as the current format example.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
              <input
                id="autoAssignManagersFromOrgChart"
                name="autoAssignManagersFromOrgChart"
                type="checkbox"
                defaultChecked={rules.autoAssignManagersFromOrgChart}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-brown focus:ring-brand-gold"
              />
              <div>
                <label htmlFor="autoAssignManagersFromOrgChart" className="text-sm font-medium text-gray-900">
                  Auto-assign managers from org chart
                </label>
                <p className="text-xs text-gray-500">
                  When a valid parent role has an active occupant, department/role updates will assign that person as line manager automatically.
                </p>
              </div>
            </div>
            <div>
              <label htmlFor="workflowFallbackReviewerRole" className="block text-sm font-medium text-gray-700">
                Fallback Reviewer Role
              </label>
              <select
                id="workflowFallbackReviewerRole"
                name="workflowFallbackReviewerRole"
                defaultValue={rules.workflowFallbackReviewerRole || "hr"}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="manager">Manager</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Used when an employee has no assigned line manager and a workflow still needs to route for review.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <input
              id="enforceAdminIpAllowlist"
              name="enforceAdminIpAllowlist"
              type="checkbox"
              defaultChecked={rules.enforceAdminIpAllowlist}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-brown focus:ring-brand-gold"
            />
            <div>
              <label htmlFor="enforceAdminIpAllowlist" className="text-sm font-medium text-gray-900">
                Enforce admin IP allowlist
              </label>
              <p className="text-xs text-gray-500">
                When enabled, admin endpoints only accept requests from the IPs listed below.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="adminIpAllowlist" className="block text-sm font-medium text-gray-700">
              Admin IP Allowlist
            </label>
            <textarea
              id="adminIpAllowlist"
              name="adminIpAllowlist"
              defaultValue={rules.adminIpAllowlist || ""}
              rows={6}
              placeholder={"203.0.113.10\n198.51.100.42"}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">Enter one IP per line. Comma-separated values are also accepted.</p>
          </div>

          <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">
            Save security rules
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
