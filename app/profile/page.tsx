import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/ProfileForm"
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload"

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

  const serializedUser = {
    ...user,
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
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <ProfileForm user={serializedUser} />
        </div>
      </div>
    </div>
  )
}
