import { auth } from "@/lib/auth"
import { getEmploymentDefaults, getSecurityAccessRules } from "@/lib/admin-settings"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/ProfileForm"
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload"
import Link from "next/link"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { normalizeUserImage } from "@/lib/avatar"
import { getOrgDepartments, getOrgRoles } from "@/lib/org-structure-data"

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      preferredName: true,
      employeeId: true,
      email: true,
      image: true,
      gender: true,
      phone: true,
      address: true,
      department: true,
      position: true,
      employmentType: true,
      workLocation: true,
      employmentStartDate: true,
      status: true,
      showBirthdayPublicly: true,
      emergencyContact: true,
      emergencyPhone: true,
      birthday: true,
      createdAt: true,
    },
  })

  if (!user) redirect("/login")

  const [employmentDefaults, securityRules, workLocations, orgDepartments, orgRoles] = await Promise.all([
    getEmploymentDefaults(),
    getSecurityAccessRules(),
    hasPrismaDelegates("workLocation")
      ? prisma.workLocation.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { name: true },
        })
      : Promise.resolve([] as Array<{ name: string }>),
    getOrgDepartments(),
    getOrgRoles(),
  ])

  const serializedUser = {
    ...user,
    image: normalizeUserImage(user.image, user.id),
    birthday: user.birthday ? user.birthday.toISOString().split("T")[0] : null,
    employmentStartDate: user.employmentStartDate ? user.employmentStartDate.toISOString().split("T")[0] : null,
    createdAt: user.createdAt.toISOString(),
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-600">
          Manage your personal information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <ProfilePhotoUpload image={serializedUser.image} name={serializedUser.name} />
            <div className="mt-4 text-center">
              <h2 className="text-lg font-medium text-gray-900">{serializedUser.name || "No name set"}</h2>
              {serializedUser.preferredName && (
                <p className="text-sm text-gray-500">Preferred: {serializedUser.preferredName}</p>
              )}
              <p className="text-sm text-gray-500">{serializedUser.email}</p>
              {serializedUser.position && (
                <p className="text-sm text-gray-500 mt-1">{serializedUser.position}</p>
              )}
              {serializedUser.department && (
                <p className="text-sm text-brand-brown font-medium mt-1">{serializedUser.department}</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">
                Member since {new Date(serializedUser.createdAt).toLocaleDateString()}
              </p>
              <Link
                href="/messages"
                className="mt-3 inline-flex rounded-full border border-[#e3bc68] bg-brand-gold px-4 py-2 text-xs font-semibold text-brand-brown"
              >
                Open messages
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <ProfileForm
            user={serializedUser}
            workLocations={workLocations.map((item) => item.name)}
            orgDepartments={orgDepartments}
            orgRoles={orgRoles}
            defaultEmploymentType={employmentDefaults.defaultEmploymentType}
            employeeIdPrefix={securityRules.employeeIdPrefix}
            employeeIdDigits={securityRules.employeeIdDigits}
          />
        </div>
      </div>
    </div>
  )
}
