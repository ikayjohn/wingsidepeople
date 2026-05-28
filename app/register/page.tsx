import RegisterForm from "@/components/RegisterForm"
import { getCompanyProfile, getEmploymentDefaults, getSecurityAccessRules } from "@/lib/admin-settings"
import { prisma } from "@/lib/prisma"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { getDepartmentsFromRoles, type OrgRoleRecord } from "@/lib/org-structure"
import { unstable_noStore as noStore } from "next/cache"

export const dynamic = "force-dynamic"

export default async function RegisterPage() {
  noStore()
  if (!hasPrismaDelegates("workLocation", "orgRole", "companyProfile", "securityAccessRule")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Settings runtime reload required" />
      </div>
    )
  }

  const [workLocations, orgRoles, companyProfile, securityRules, employmentDefaults] = await Promise.all([
    prisma.workLocation.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    }),
    prisma.orgRole.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        department: true,
        parentRoleId: true,
        sortOrder: true,
        isActive: true,
      },
    }),
    getCompanyProfile(),
    getSecurityAccessRules(),
    getEmploymentDefaults(),
  ])

  const strictOrgRoles = orgRoles as OrgRoleRecord[]
  const orgDepartments = Array.from(
    new Set(
      getDepartmentsFromRoles(strictOrgRoles)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b))

  if (workLocations.length === 0 || strictOrgRoles.length === 0 || orgDepartments.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice
          title="Signup options not configured"
          description="Registration requires active Work Locations and active Organization Roles. Configure these in Admin Settings before users can sign up."
        />
      </div>
    )
  }

  return (
    <RegisterForm
      workLocations={workLocations.map((item: { name: string }) => item.name)}
      orgDepartments={orgDepartments}
      orgRoles={strictOrgRoles}
      companyName={companyProfile.companyName}
      companyTagline={companyProfile.tagline}
      supportEmail={companyProfile.supportEmail}
      allowedEmailDomain={securityRules.allowedEmailDomain}
      employeeIdPrefix={securityRules.employeeIdPrefix}
      employeeIdDigits={securityRules.employeeIdDigits}
      passwordMinLength={securityRules.passwordMinLength}
      allowSelfServiceRegistration={securityRules.allowSelfServiceRegistration}
      defaultEmploymentType={employmentDefaults.defaultEmploymentType}
    />
  )
}
