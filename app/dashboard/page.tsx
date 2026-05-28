import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import Image from "next/image"
import { daysUntil, isSameMonthDay, nextBirthdayDate } from "@/lib/birthday-utils"
import { canAccessAdminArea } from "@/lib/rbac"
import { getMissingProfileFields } from "@/lib/profile-completion"
import { average, calculateProgressPercentage } from "@/lib/performance"
import {
  Megaphone,
  Target,
  CheckSquare,
  HeartHandshake,
  Cake,
  CalendarDays,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  FileText,
  FolderOpen,
  ClipboardList,
} from "lucide-react"

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

type KpiSnapshot = {
  id: string
  title: string
  targetValue: number | null
  currentValue: number | null
  unit: string | null
  status: string
  period: string
}

type DepartmentPerformanceItem = {
  id: string
  title: string
  targetValue: number | null
  currentValue: number | null
  unit: string | null
  status: string
  department: { name: string }
}

type TrainingEnrollmentItem = {
  id: string
  progress: number
  status: string
  completedAt: Date | null
  course: {
    title: string
    isMandatory: boolean
  }
}

type ReviewItem = {
  id: string
  period: string
  type: string
  status: string
  createdAt: Date
  submittedAt: Date | null
  reviewer: { name: string | null; preferredName: string | null; email: string }
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
    prisma.employeeKpi.findMany({
      where: { userId: session.user.id, status: "active" },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        status: true,
        period: true,
      },
    }),
    prisma.departmentKpi.findMany({
      where: { department: { users: { some: { id: session.user.id } } }, status: "active" },
      orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        status: true,
        department: { select: { name: true } },
      },
    }),
    prisma.courseEnrollment.findMany({
      where: { userId: session.user.id },
      orderBy: [{ status: "asc" }, { enrolledAt: "desc" }],
      take: 6,
      select: {
        id: true,
        progress: true,
        status: true,
        completedAt: true,
        course: {
          select: {
            title: true,
            isMandatory: true,
          },
        },
      },
    }),
    prisma.performanceReview.findMany({
      where: { userId: session.user.id, status: { in: ["draft", "submitted"] } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        id: true,
        period: true,
        type: true,
        status: true,
        createdAt: true,
        submittedAt: true,
        reviewer: { select: { name: true, preferredName: true, email: true } },
      },
    }),
  ])

  const profile: ProfileData = results[0].status === "fulfilled" ? results[0].value : null
  const announcements: AnnouncementItem[] = results[1].status === "fulfilled" ? results[1].value : []
  const checklists: ChecklistItem[] = results[2].status === "fulfilled" ? results[2].value : []
  const upcomingEvents: UpcomingEvent[] = results[3].status === "fulfilled" ? results[3].value : []
  const policyUpdates: PolicyUpdate[] = results[4].status === "fulfilled" ? results[4].value : []
  const recognitionHighlights: RecognitionItem[] = results[5].status === "fulfilled" ? results[5].value : []
  const birthdayUsers: BirthdayUser[] = results[6].status === "fulfilled" ? results[6].value : []
  const kpiSnapshot: KpiSnapshot[] = results[7].status === "fulfilled" ? results[7].value : []
  const departmentPerformance: DepartmentPerformanceItem[] = results[8].status === "fulfilled" ? results[8].value : []
  const trainingEnrollments: TrainingEnrollmentItem[] = results[9].status === "fulfilled" ? results[9].value : []
  const upcomingReviews: ReviewItem[] = results[10].status === "fulfilled" ? results[10].value : []

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

  const personalKpiAverage = average(
    kpiSnapshot.map((kpi) => calculateProgressPercentage(kpi.currentValue, kpi.targetValue))
  )
  const departmentAverage = average(
    departmentPerformance.map((kpi) => calculateProgressPercentage(kpi.currentValue, kpi.targetValue))
  )
  const completedTraining = trainingEnrollments.filter((item) => item.status === "completed").length
  const trainingCompletionRate = trainingEnrollments.length
    ? Math.round((completedTraining / trainingEnrollments.length) * 100)
    : 0

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
          <QuickLink href="/my-kpis" label="My KPIs" icon={<Target className="h-4 w-4" />} />
          <QuickLink href="/academy" label="Academy" icon={<GraduationCap className="h-4 w-4" />} />
          <QuickLink href="/handbook" label="Handbook" icon={<BookOpen className="h-4 w-4" />} />
          <QuickLink href="/policies" label="Policies" icon={<ShieldCheck className="h-4 w-4" />} />
          <QuickLink href="/documents" label="Documents" icon={<FolderOpen className="h-4 w-4" />} />
          <QuickLink href="/leave" label="Leave & Requests" icon={<ClipboardList className="h-4 w-4" />} />
        </div>
      </section>

      <section className="panel mb-6 overflow-hidden">
        <div className="relative h-56 w-full sm:h-64">
          <Image
            src="/people2.jpg"
            alt="Wingside Team"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">People First</p>
            <p className="mt-1 text-xl font-semibold sm:text-2xl">Stronger teams build better outcomes.</p>
          </div>
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
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Megaphone className="h-5 w-5 text-brand-brown" />
                Announcements
              </h2>
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
            <section className="panel lg:col-span-2">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Performance Snapshot</h2>
                  <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Target className="h-4 w-4" />
                    Performance
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Monitor KPI progress, department performance, learning completion, and upcoming reviews.
                  </p>
                </div>
                <Link href="/my-kpis" className="interactive-link text-sm font-medium text-brand-brown hover:text-brand-brown-light">
                  Open performance
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 border-b border-gray-100 px-5 py-4 md:grid-cols-4">
                <DashboardMetric
                  label="KPI progress"
                  value={`${Math.round(personalKpiAverage)}%`}
                  detail={`${kpiSnapshot.length} active KPI${kpiSnapshot.length === 1 ? "" : "s"}`}
                  icon={<Target className="h-4 w-4" />}
                />
                <DashboardMetric
                  label="Department"
                  value={`${Math.round(departmentAverage)}%`}
                  detail={departmentPerformance[0]?.department.name || "No department KPI data"}
                  icon={<BookOpen className="h-4 w-4" />}
                />
                <DashboardMetric
                  label="Training"
                  value={`${trainingCompletionRate}%`}
                  detail={`${completedTraining}/${trainingEnrollments.length} courses completed`}
                  icon={<GraduationCap className="h-4 w-4" />}
                />
                <DashboardMetric
                  label="Reviews"
                  value={upcomingReviews.length}
                  detail={upcomingReviews.length ? "Pending review items" : "No pending reviews"}
                  icon={<CheckSquare className="h-4 w-4" />}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 px-5 py-4 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Active KPIs</h3>
                    <Link href="/my-kpis" className="text-xs font-medium text-brand-brown hover:text-brand-brown-light">
                      View all
                    </Link>
                  </div>
                  {kpiSnapshot.length > 0 ? (
                    <ul className="space-y-3">
                      {kpiSnapshot.slice(0, 3).map((kpi) => {
                        const progress = calculateProgressPercentage(kpi.currentValue, kpi.targetValue)
                        return (
                          <li key={kpi.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{kpi.title}</p>
                                <p className="mt-1 text-xs text-gray-500">{kpi.period}</p>
                              </div>
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                {progress}%
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                              {kpi.currentValue ?? 0} / {kpi.targetValue ?? 0} {kpi.unit ?? ""}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No active KPIs assigned yet.</p>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Upcoming Reviews</h3>
                    <Link href="/my-kpis" className="text-xs font-medium text-brand-brown hover:text-brand-brown-light">
                      Review center
                    </Link>
                  </div>
                  {upcomingReviews.length > 0 ? (
                    <ul className="space-y-3">
                      {upcomingReviews.map((review) => (
                        <li key={review.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{review.period}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {review.type.replaceAll("_", " ")} review with{" "}
                                {review.reviewer.preferredName || review.reviewer.name || review.reviewer.email}
                              </p>
                            </div>
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              {review.status}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Created {new Date(review.createdAt).toLocaleDateString()}
                            {review.submittedAt ? ` • Submitted ${new Date(review.submittedAt).toLocaleDateString()}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No upcoming performance reviews right now.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 border-t border-gray-100 px-5 py-4 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Department Performance</h3>
                    <Link href="/my-kpis" className="text-xs font-medium text-brand-brown hover:text-brand-brown-light">
                      Department view
                    </Link>
                  </div>
                  {departmentPerformance.length > 0 ? (
                    <ul className="space-y-3">
                      {departmentPerformance.slice(0, 3).map((kpi) => {
                        const progress = calculateProgressPercentage(kpi.currentValue, kpi.targetValue)
                        return (
                          <li key={kpi.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{kpi.title}</p>
                                <p className="mt-1 text-xs text-gray-500">{kpi.department.name}</p>
                              </div>
                              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                {progress}%
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                              {kpi.currentValue ?? 0} / {kpi.targetValue ?? 0} {kpi.unit ?? ""}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No department KPI progress available yet.</p>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Training Completion</h3>
                    <Link href="/academy" className="text-xs font-medium text-brand-brown hover:text-brand-brown-light">
                      Open academy
                    </Link>
                  </div>
                  {trainingEnrollments.length > 0 ? (
                    <ul className="space-y-3">
                      {trainingEnrollments.slice(0, 3).map((item) => (
                        <li key={item.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.course.title}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {item.course.isMandatory ? "Mandatory" : "Optional"} course
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              item.status === "completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {item.status.replaceAll("_", " ")}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            {Math.round(item.progress)}% complete
                            {item.completedAt ? ` • Completed ${new Date(item.completedAt).toLocaleDateString()}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No training enrollments yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <CheckSquare className="h-5 w-5 text-brand-brown" />
                  Onboarding Progress
                </h2>
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
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <HeartHandshake className="h-5 w-5 text-brand-brown" />
                  Recognition
                </h2>
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
          <section className="panel overflow-hidden">
            <div className="relative h-[32rem]">
              <Image
                src="/people4.jpg"
                alt="Team momentum"
                fill
                sizes="(min-width: 1280px) 33vw, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Momentum</p>
                <p className="mt-1 text-sm font-semibold text-white">Small wins compound every week.</p>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Cake className="h-5 w-5 text-brand-brown" />
                Birthdays
              </h2>
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
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900">
                <CalendarDays className="h-5 w-5 text-brand-brown" />
                Upcoming Events
              </h2>
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
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900">
                <FileText className="h-5 w-5 text-brand-brown" />
                Policy Updates
              </h2>
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

function QuickLink({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="interactive-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
    >
      {icon}
      {label}
    </Link>
  )
}

function DashboardMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string | number
  detail: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  )
}
