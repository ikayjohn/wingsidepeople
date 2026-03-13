import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { getCompanyProfile, getEmploymentDefaults, getSecurityAccessRules, getEmployeeIdExample } from "@/lib/admin-settings"

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "settings")) redirect("/admin")

  const [companyProfile, employmentDefaults, securityRules] = await Promise.all([
    getCompanyProfile(),
    getEmploymentDefaults(),
    getSecurityAccessRules(),
  ])

  const settingsCards = [
    {
      href: "/admin/settings/company",
      title: "Company Profile",
      description: `${companyProfile.companyName}${companyProfile.headquartersLocation ? ` • ${companyProfile.headquartersLocation}` : ""}`,
      iconClass: "bg-amber-100 text-amber-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01"
        />
      ),
    },
    {
      href: "/admin/settings/employment",
      title: "Employment Defaults",
      description: `${employmentDefaults.defaultAnnualLeaveAllowance} leave days • ${employmentDefaults.standardWorkWeekDays}-day week`,
      iconClass: "bg-emerald-100 text-emerald-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10m-9 4h6m5 2H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2z"
        />
      ),
    },
    {
      href: "/admin/settings/organization",
      title: "Organization Structure",
      description: "Manage departments, role hierarchy, and manager-routing defaults.",
      iconClass: "bg-sky-100 text-sky-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 5v4m0 0H8m4 0h4m-9 8h10m-7-4h4M5 19h14a2 2 0 002-2v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2z"
        />
      ),
    },
    {
      href: "/admin/settings/security",
      title: "Security & Access Rules",
      description: `${securityRules.allowedEmailDomain} • ${getEmployeeIdExample(securityRules.employeeIdPrefix, securityRules.employeeIdDigits)}`,
      iconClass: "bg-rose-100 text-rose-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3zm0 0v8m-7-4a7 7 0 1114 0"
        />
      ),
    },
    {
      href: "/admin/work-locations",
      title: "Work Locations",
      description: "Manage the signup and employee profile location list.",
      iconClass: "bg-cyan-100 text-cyan-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11zm0-8a3 3 0 100-6 3 3 0 000 6z"
        />
      ),
    },
  ]

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Configuration</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage shared company information, employment defaults, signup rules, and portal operations from one place.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
          <Link key={card.href} href={card.href} className="panel block overflow-hidden p-6">
            <div className="flex items-start gap-4">
              <div className={`rounded-xl p-3 ${card.iconClass}`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {card.icon}
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
