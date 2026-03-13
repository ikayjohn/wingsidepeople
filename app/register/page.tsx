import RegisterForm from "@/components/RegisterForm"
import { getCompanyProfile, getEmploymentDefaults, getSecurityAccessRules } from "@/lib/admin-settings"
import { prisma } from "@/lib/prisma"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { getOrgDepartments, getOrgRoles } from "@/lib/org-structure-data"

export default async function RegisterPage() {
  if (!hasPrismaDelegates("workLocation", "companyProfile", "securityAccessRule")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Settings runtime reload required" />
      </div>
    )
  }

  const [workLocations, companyProfile, securityRules, employmentDefaults, orgDepartments, orgRoles] = await Promise.all([
    prisma.workLocation.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    }),
    getCompanyProfile(),
    getSecurityAccessRules(),
    getEmploymentDefaults(),
    getOrgDepartments(),
    getOrgRoles(),
  ])

  return (
    <RegisterForm
      workLocations={workLocations.map((item: { name: string }) => item.name)}
      orgDepartments={orgDepartments}
      orgRoles={orgRoles}
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
