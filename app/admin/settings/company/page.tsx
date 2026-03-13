import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { canAccessAdminSection } from "@/lib/rbac"
import { getCompanyProfile } from "@/lib/admin-settings"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { SectionCard, StatCard } from "@/components/ModuleCards"
import { updateCompanyProfile } from "@/app/admin/settings/actions"

export default async function AdminCompanyProfilePage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "settings")) redirect("/admin")
  if (!hasPrismaDelegates("companyProfile")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Company profile runtime reload required" />
      </div>
    )
  }

  const profile = await getCompanyProfile()

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Settings</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">Company Profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Manage the company identity shown across admin settings, onboarding context, and self-service signup.
            </p>
          </div>
          <Link href="/admin/settings" className="text-sm font-medium text-brand-brown hover:text-brand-brown-light">
            Back to settings
          </Link>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Company" value={profile.companyName} tone="amber" />
        <StatCard label="Support Email" value={profile.supportEmail || "Not set"} tone="blue" />
        <StatCard label="Headquarters" value={profile.headquartersLocation || "Not set"} tone="green" />
      </section>

      <SectionCard title="Profile Details" description="These values define the company identity used across HR-facing screens.">
        <form action={updateCompanyProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input id="companyName" name="companyName" defaultValue={profile.companyName} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label htmlFor="legalName" className="block text-sm font-medium text-gray-700">
                Legal Name
              </label>
              <input id="legalName" name="legalName" defaultValue={profile.legalName || ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>

          <div>
            <label htmlFor="tagline" className="block text-sm font-medium text-gray-700">
              Tagline
            </label>
            <input id="tagline" name="tagline" defaultValue={profile.tagline || ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="supportEmail" className="block text-sm font-medium text-gray-700">
                Support Email
              </label>
              <input id="supportEmail" name="supportEmail" type="email" defaultValue={profile.supportEmail || ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label htmlFor="supportPhone" className="block text-sm font-medium text-gray-700">
                Support Phone
              </label>
              <input id="supportPhone" name="supportPhone" defaultValue={profile.supportPhone || ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input id="websiteUrl" name="websiteUrl" type="url" defaultValue={profile.websiteUrl || ""} placeholder="https://example.com" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label htmlFor="headquartersLocation" className="block text-sm font-medium text-gray-700">
                Headquarters
              </label>
              <input id="headquartersLocation" name="headquartersLocation" defaultValue={profile.headquartersLocation || ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>

          <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">
            Save company profile
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
