import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import { createAssessment, createCourse, enrollEmployee } from "@/app/admin/academy/actions"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"

export default async function AdminAcademyPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "academy")) redirect("/admin")
  if (!hasPrismaDelegates("course", "courseEnrollment", "assessmentAttempt")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Academy runtime reload required" />
      </div>
    )
  }

  const [courseTotals, publishedCourses, mandatoryCourses, assessmentTotals, certifiedEnrollments, enrollmentStatusCounts, courses, enrollments, employees] = await Promise.all([
    prisma.course.count(),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.course.count({ where: { isMandatory: true } }),
    prisma.assessment.count(),
    prisma.courseEnrollment.count({ where: { certificateAwardedAt: { not: null } } }),
    prisma.courseEnrollment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        modules: { select: { id: true, videoUrl: true, resourceUrl: true } },
        _count: { select: { enrollments: true, assessments: true } },
      },
    }),
    prisma.courseEnrollment.findMany({
      orderBy: [{ completedAt: "desc" }, { enrolledAt: "desc" }],
      take: 20,
      include: {
        user: { select: { name: true, preferredName: true, email: true, department: true, position: true } },
        course: { select: { title: true, certificateTitle: true } },
      },
    }),
    prisma.user.findMany({
      where: { status: "active", role: { notIn: ["admin", "super_admin"] } },
      select: { id: true, name: true, preferredName: true, email: true, department: true, position: true },
      orderBy: { name: "asc" },
    }),
  ])

  const enrollmentCounts = enrollmentStatusCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all
    return acc
  }, {})
  const totalEnrollments = Object.values(enrollmentCounts).reduce((sum, count) => sum + count, 0)
  const completedEnrollments = enrollmentCounts.completed ?? 0

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Capability Building</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Company Academy</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage targeted learning paths, training modules, quizzes, completions, and employee certifications.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard label="Courses" value={courseTotals} tone="blue" />
        <StatCard label="Published" value={publishedCourses} tone="green" />
        <StatCard label="Mandatory" value={mandatoryCourses} tone="amber" />
        <StatCard label="Assessments" value={assessmentTotals} />
        <StatCard label="Certificates" value={certifiedEnrollments} tone="blue" />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Create Course" description="Add a targeted learning path with rich training modules.">
          <form action={createCourse} className="grid grid-cols-1 gap-3">
            <input name="title" required placeholder="Course title" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input name="category" required placeholder="Category" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input name="learningPath" placeholder="Learning path" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input name="department" placeholder="Department (optional)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input name="position" placeholder="Job role (optional)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input name="duration" type="number" placeholder="Duration in minutes" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <select name="difficulty" defaultValue="beginner" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <input name="certificateTitle" placeholder="Certificate title (optional)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea name="description" rows={3} placeholder="Description" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea
              name="modules"
              rows={5}
              placeholder="One module per line: Title | Video URL | Duration | Content summary | Resource URL"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="isPublished" /> Publish immediately</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="isMandatory" /> Mandatory</label>
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">Create course</button>
          </form>
        </SectionCard>

        <SectionCard title="Create Assessment" description="Attach a short quiz or test to a course.">
          <form action={createAssessment} className="grid grid-cols-1 gap-3">
            <select name="courseId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <input name="title" required placeholder="Assessment title" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="passingScore" type="number" min="1" max="100" defaultValue="70" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea name="questions" rows={5} placeholder="One per line: Question | Expected answer" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">Create assessment</button>
          </form>
        </SectionCard>

        <SectionCard title="Assign Training" description="Enroll an employee in a course directly.">
          <form action={enrollEmployee} className="grid grid-cols-1 gap-3">
            <select name="courseId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <select name="userId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.preferredName || employee.name || employee.email}
                  {employee.department ? ` · ${employee.department}` : ""}
                  {employee.position ? ` · ${employee.position}` : ""}
                </option>
              ))}
            </select>
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">Enroll employee</button>
          </form>
        </SectionCard>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Course Library" description="Recent learning paths with targeting and resource coverage.">
            <div className="space-y-3">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <div key={course.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{course.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {course.learningPath || course.category}
                      </span>
                      {!course.isPublished ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Draft
                        </span>
                      ) : null}
                      {course.isMandatory ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          Mandatory
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {course.department || "All departments"}{course.position ? ` · ${course.position}` : ""} • {course.modules.length} modules • {course._count.enrollments} enrollments • {course._count.assessments} assessments
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {course.modules.filter((module) => module.videoUrl).length} video modules • {course.modules.filter((module) => module.resourceUrl).length} resource links
                    </p>
                    {course.certificateTitle ? (
                      <p className="mt-1 text-xs text-blue-600">Certificate: {course.certificateTitle}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState label="No academy courses created yet." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Recent Learning Progress" description="Employee completion and certification milestones.">
            <div className="space-y-3">
              {enrollments.length > 0 ? (
                enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {enrollment.user.preferredName || enrollment.user.name || enrollment.user.email}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {enrollment.course.title} • {Math.round(enrollment.progress)}% • {enrollment.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {enrollment.user.department || "No department"}{enrollment.user.position ? ` · ${enrollment.user.position}` : ""}
                    </p>
                    {enrollment.certificateAwardedAt && enrollment.course.certificateTitle ? (
                      <p className="mt-1 text-xs text-blue-600">Certified: {enrollment.course.certificateTitle}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState label="No enrollments recorded yet." />
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Completion Snapshot" description="Enrollment completion versus in-progress learning.">
          <div className="space-y-4">
            <MetricBar label="Completed" value={completedEnrollments} total={Math.max(totalEnrollments, 1)} tone="green" />
            <MetricBar label="In progress" value={enrollmentCounts.in_progress ?? 0} total={Math.max(totalEnrollments, 1)} tone="blue" />
            <MetricBar label="Enrolled" value={enrollmentCounts.enrolled ?? 0} total={Math.max(totalEnrollments, 1)} tone="gold" />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
