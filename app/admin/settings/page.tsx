import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { getCompanyProfile, getEmploymentDefaults, getSecurityAccessRules, getEmployeeIdExample } from "@/lib/admin-settings"
import { Building2, CalendarDays, Network, ShieldCheck, MapPin } from "lucide-react"

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
      icon: Building2,
    },
    {
      href: "/admin/settings/employment",
      title: "Employment Defaults",
      description: `${employmentDefaults.defaultAnnualLeaveAllowance} leave days • ${employmentDefaults.standardWorkWeekDays}-day week`,
      iconClass: "bg-emerald-100 text-emerald-700",
      icon: CalendarDays,
    },
    {
      href: "/admin/settings/organization",
      title: "Organization Structure",
      description: "Manage departments, role hierarchy, and manager-routing defaults.",
      iconClass: "bg-sky-100 text-sky-700",
      icon: Network,
    },
    {
      href: "/admin/settings/security",
      title: "Security & Access Rules",
      description: `${securityRules.allowedEmailDomain} • ${getEmployeeIdExample(securityRules.employeeIdPrefix, securityRules.employeeIdDigits)}`,
      iconClass: "bg-rose-100 text-rose-700",
      icon: ShieldCheck,
    },
    {
      href: "/admin/work-locations",
      title: "Work Locations",
      description: "Manage the signup and employee profile location list.",
      iconClass: "bg-cyan-100 text-cyan-700",
      icon: MapPin,
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
                <card.icon className="h-6 w-6" />
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
