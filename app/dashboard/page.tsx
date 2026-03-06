import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import { daysUntil, isSameMonthDay, nextBirthdayDate } from "@/lib/birthday-utils"
import { canAccessAdminArea } from "@/lib/rbac"
import { getMissingProfileFields } from "@/lib/profile-completion"

type BirthdayUser = {
  id: string
  name: string | null
  preferredName: string | null
  department: string | null
  birthday: Date | null
}

type ProfileData = {
  employeeId: string | null
  gender: string | null
  phone: string | null
  address: string | null
  department: string | null
  position: string | null
  employmentType: string | null
  workLocation: string | null
  employmentStartDate: Date | null
  emergencyContact: string | null
  emergencyPhone: string | null
  birthday: Date | null
} | null

type AnnouncementItem = {
  id: string
  title: string
  pinned: boolean
  publishedAt: Date
}

type ChecklistItem = {
  id: string
  template: { title: string }
  progress: { completed: boolean }[]
}

type UpcomingEvent = {
  id: string
  title: string
  startDate: Date
}

type PolicyUpdate = {
  id: string
  title: string
  updatedAt: Date
}

type RecognitionItem = {
  id: string
  title: string
  fromUser: { name: string | null; preferredName: string | null }
  toUser: { name: string | null; preferredName: string | null }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (canAccessAdminArea(session.user.role)) redirect("/admin")

  const results = await Promise.allSettled([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        employeeId: true,
        gender: true,
        phone: true,
        address: true,
        department: true,
        position: true,
        employmentType: true,
        workLocation: true,
        employmentStartDate: true,
        emergencyContact: true,
        emergencyPhone: true,
        birthday: true,
      },
    }),
    prisma.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 6,
      select: { id: true, title: true, pinned: true, publishedAt: true },
    }),
    prisma.employeeChecklist.findMany({
      where: { userId: session.user.id },
      include: {
        template: { select: { title: true } },
        progress: true,
      },
      take: 3,
    }),
    prisma.event.findMany({
      where: { startDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 6,
      select: { id: true, title: true, startDate: true },
    }),
    prisma.policy.findMany({
      where: { status: "published" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.recognition.findMany({
      where: { isPublic: true },
      include: {
        fromUser: { select: { name: true, preferredName: true } },
        toUser: { select: { name: true, preferredName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.user.findMany({
      where: {
        birthday: { not: null },
        showBirthdayPublicly: true,
        status: { not: "exited" },
      },
      select: {
        id: true,
        name: true,
        preferredName: true,
        department: true,
        birthday: true,
      },
      take: 100,
    }),
  ])

  const profile: ProfileData = results[0].status === "fulfilled" ? results[0].value : null
  const announcements: AnnouncementItem[] = results[1].status === "fulfilled" ? results[1].value : []
  const checklists: ChecklistItem[] = results[2].status === "fulfilled" ? results[2].value : []
  const upcomingEvents: UpcomingEvent[] = results[3].status === "fulfilled" ? results[3].value : []
  const policyUpdates: PolicyUpdate[] = results[4].status === "fulfilled" ? results[4].value : []
  const recognitionHighlights: RecognitionItem[] = results[5].status === "fulfilled" ? results[5].value : []
  const birthdayUsers: BirthdayUser[] = results[6].status === "fulfilled" ? results[6].value : []

  const missingProfileFields = getMissingProfileFields(profile)

  const now = new Date()
  const todaysBirthdays = birthdayUsers.filter((u) => u.birthday && isSameMonthDay(u.birthday, now))
  const upcomingBirthdays = birthdayUsers
    .filter((u) => u.birthday)
    .map((u) => ({
      ...u,
      inDays: daysUntil(nextBirthdayDate(u.birthday!, now), now),
    }))
    .filter((u) => u.inDays > 0 && u.inDays <= 7)
    .sort((a, b) => a.inDays - b.inDays)

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Employee Portal</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">
          Welcome back, {session.user.name || "Teammate"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Your daily snapshot: announcements, policy updates, team celebrations, and upcoming events.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <QuickLink href="/handbook" label="Handbook" />
          <QuickLink href="/policies" label="Policies" />
          <QuickLink href="/documents" label="Documents" />
          <QuickLink href="/leave" label="Leave & Requests" />
        </div>
      </section>

      {missingProfileFields.length > 0 && (
        <section className="mb-6 rounded-2xl border border-[#f6d48f] bg-gradient-to-r from-[#fff7df] to-[#fff2cb] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-brown">Complete your profile</p>
              <p className="mt-1 text-sm text-[#6f5b2e]">
                Please update your details in Profile to unlock full staff features. Missing: {missingProfileFields.join(", ")}.
              </p>
            </div>
            <Link
              href="/profile"
              className="inline-flex min-w-max items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#e3bc68] bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-brown hover:-translate-y-0.5"
            >
              <span>Complete Profile</span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-brand-brown">
                {missingProfileFields.length}
              </span>
            </Link>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="panel">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
              <Link href="/announcements" className="text-sm font-medium text-brand-brown hover:text-brand-brown-light">
                View all
              </Link>
            </div>
            {announcements.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {announcements.map((item) => (
                  <li key={item.id}>
                    <Link href={`/announcements/${item.id}`} className="block px-5 py-4 hover:bg-[#f4f8ff]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.pinned && (
                              <span className="mr-2 rounded-full bg-brand-gold-light px-2 py-0.5 text-xs font-semibold text-brand-brown">
                                Pinned
                              </span>
                            )}
                            {item.title}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(item.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-gray-500">No announcements available.</p>
            )}
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="panel">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Onboarding Progress</h2>
                <Link href="/onboarding" className="interactive-link text-sm font-medium text-brand-brown hover:text-brand-brown-light">
                  Open
                </Link>
              </div>
              {checklists.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {checklists.map((item) => {
                    const total = item.progress.length
                    const complete = item.progress.filter((p) => p.completed).length
                    const percent = total > 0 ? Math.round((complete / total) * 100) : 0
                    return (
                      <li key={item.id} className="px-5 py-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{item.template.title}</p>
                          <p className="text-xs text-gray-500">{complete}/{total}</p>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-brand-gold via-[#ffcb5e] to-[#ffd988]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-gray-500">No onboarding checklist assigned.</p>
              )}
            </section>

            <section className="panel">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Recognition</h2>
                <Link href="/recognition" className="interactive-link text-sm font-medium text-brand-brown hover:text-brand-brown-light">
                  Open
                </Link>
              </div>
              {recognitionHighlights.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {recognitionHighlights.map((item) => (
                    <li key={item.id} className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="mt-1 text-xs text-[#55718f]">
                        {item.fromUser.preferredName || item.fromUser.name} → {item.toUser.preferredName || item.toUser.name}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-gray-500">No recognition posted yet.</p>
              )}
            </section>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Birthdays</h2>
            </div>
            <div className="px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Today</p>
              {todaysBirthdays.length > 0 ? (
                <ul className="space-y-1">
                  {todaysBirthdays.map((u) => (
                    <li key={u.id} className="text-sm text-gray-700">
                      {u.preferredName || u.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No birthdays today.</p>
              )}
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">This week</p>
              {upcomingBirthdays.length > 0 ? (
                <ul className="space-y-1">
                  {upcomingBirthdays.map((u) => (
                    <li key={u.id} className="text-sm text-gray-700">
                      {u.preferredName || u.name} in {u.inDays} day{u.inDays > 1 ? "s" : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No upcoming birthdays this week.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
              <Link href="/calendar" className="text-sm font-medium text-brand-brown hover:text-brand-brown-light">
                Calendar
              </Link>
            </div>
            {upcomingEvents.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{new Date(event.startDate).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-gray-500">No upcoming events.</p>
            )}
          </section>

          <section className="panel">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Policy Updates</h2>
              <Link href="/policies" className="text-sm font-medium text-brand-brown hover:text-brand-brown-light">
                Policies
              </Link>
            </div>
            {policyUpdates.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {policyUpdates.map((item) => (
                  <li key={item.id}>
                    <Link href={`/policies/${item.id}`} className="block px-5 py-3 hover:bg-[#f4f8ff]">
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{new Date(item.updatedAt).toLocaleDateString()}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-gray-500">No recent policy changes.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="interactive-chip rounded-full px-3 py-1.5 text-sm font-medium"
    >
      {label}
    </Link>
  )
}
