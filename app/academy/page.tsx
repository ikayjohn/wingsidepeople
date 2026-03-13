import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EmptyState, SectionCard, StatCard } from "@/components/ModuleCards"
import { completeModule, enrollInCourse, submitAssessment } from "@/app/academy/actions"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { calculateAcademyProgress, getAssessmentState, getModuleUnlockState, parseCompletedModules } from "@/lib/academy"

type AssessmentQuestion = {
  id: string
  prompt: string
}

export default async function AcademyPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasPrismaDelegates("course", "courseEnrollment", "assessmentAttempt")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Academy runtime reload required" />
      </div>
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, department: true, position: true },
  })

  const [courses, enrollments, attempts] = await Promise.all([
    prisma.course.findMany({
      where: {
        isPublished: true,
        OR: [
          { department: null, position: null },
          { department: null, position: user?.position ?? undefined },
          { department: user?.department ?? undefined, position: null },
          { department: user?.department ?? undefined, position: user?.position ?? undefined },
        ],
      },
      orderBy: [{ isMandatory: "desc" }, { learningPath: "asc" }, { createdAt: "desc" }],
      include: {
        modules: {
          select: { id: true, title: true, duration: true, content: true, videoUrl: true, resourceUrl: true, order: true },
          orderBy: { order: "asc" },
        },
        assessments: { select: { id: true, title: true, passingScore: true, questions: true } },
        enrollments: {
          where: { userId: session.user.id },
          select: { id: true, progress: true, status: true, completedAt: true, completedModules: true, certificateAwardedAt: true },
        },
      },
    }),
    prisma.courseEnrollment.findMany({
      where: { userId: session.user.id },
      include: { course: { select: { title: true, isMandatory: true, certificateTitle: true } } },
      orderBy: { enrolledAt: "desc" },
      take: 8,
    }),
    prisma.assessmentAttempt.findMany({
      where: { userId: session.user.id },
      orderBy: { startedAt: "desc" },
      take: 8,
      include: {
        assessment: {
          select: {
            title: true,
            courseId: true,
            course: { select: { title: true } },
          },
        },
      },
    }),
  ])

  const attemptsByCourseId = new Map<string, typeof attempts>()
  for (const attempt of attempts) {
    const courseId = attempt.assessment.courseId
    const current = attemptsByCourseId.get(courseId) ?? []
    current.push(attempt)
    attemptsByCourseId.set(courseId, current)
  }

  const academyCourses = courses.map((course) => {
    const enrollment = course.enrollments[0] ?? null
    const completedModules = parseCompletedModules(enrollment?.completedModules)
    const assessmentState = getAssessmentState((attemptsByCourseId.get(course.id) ?? []).map((attempt) => ({
      passed: attempt.passed,
      completedAt: attempt.completedAt,
    })))
    const progressState = calculateAcademyProgress({
      moduleIds: course.modules.map((module) => module.id),
      completedModules,
      requiresAssessment: course.assessments.length > 0,
      hasPassedAssessment: assessmentState.hasPassedAssessment,
    })

    return {
      ...course,
      enrollment,
      completedModules,
      assessmentState,
      progressState,
    }
  })

  const mandatoryCourses = academyCourses.filter((course) => course.isMandatory).length
  const completedCourses = academyCourses.filter((course) => course.progressState.courseComplete).length
  const earnedCertificates = academyCourses.filter((course) => course.enrollment?.certificateAwardedAt).length

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Learning Hub</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Company Academy</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Structured training for onboarding, compliance, and continuous professional development.
        </p>
        <p className="mt-3 text-xs text-gray-500">
          Learning path for {user?.department || "all departments"}{user?.position ? ` · ${user.position}` : ""}
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Available courses" value={academyCourses.length} />
        <StatCard label="Mandatory" value={mandatoryCourses} tone="amber" />
        <StatCard label="Completed" value={completedCourses} tone="green" />
        <StatCard label="Certificates" value={earnedCertificates} tone="blue" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Learning Paths" description="Training tailored to your department, role, and company-wide requirements.">
            <div className="space-y-4">
              {academyCourses.length > 0 ? (
                academyCourses.map((course) => (
                  <div key={course.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{course.title}</p>
                          {course.isMandatory ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              Mandatory
                            </span>
                          ) : null}
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {course.learningPath || course.category.replaceAll("_", " ")}
                          </span>
                          {course.department || course.position ? (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                              {course.department || "All depts"}{course.position ? ` · ${course.position}` : ""}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {course.modules.length} module{course.modules.length === 1 ? "" : "s"} • {course.duration ?? 0} mins • {course.difficulty}
                        </p>
                        {course.description ? (
                          <p className="mt-2 text-sm text-gray-600">{course.description}</p>
                        ) : null}
                      </div>

                      {course.enrollment ? (
                        <div className="min-w-[130px] rounded-2xl bg-slate-50 px-3 py-2 text-right">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Progress</p>
                          <p className="text-lg font-semibold text-gray-900">{Math.round(course.progressState.progress)}%</p>
                          <p className="text-xs text-gray-500">
                            {course.progressState.completedModuleCount}/{course.progressState.totalModules} modules
                          </p>
                        </div>
                      ) : (
                        <form action={enrollInCourse}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <button className="rounded-full border border-[#e3bc68] bg-brand-gold px-4 py-2 text-xs font-semibold text-brand-brown">
                            Enroll now
                          </button>
                        </form>
                      )}
                    </div>

                    {course.enrollment ? (
                      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                        {course.modules.map((module) => {
                          const isComplete = course.completedModules.has(module.id)
                          const isUnlocked = getModuleUnlockState({
                            moduleIds: course.modules.map((entry) => entry.id),
                            completedModules: course.completedModules,
                            moduleId: module.id,
                          })

                          return (
                            <div key={module.id} className={`rounded-xl border px-4 py-3 ${isUnlocked ? "border-gray-200" : "border-gray-100 bg-gray-50"}`}>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-900">{module.title}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      isComplete ? "bg-emerald-50 text-emerald-700" : isUnlocked ? "bg-brand-gold-light text-brand-brown" : "bg-gray-200 text-gray-600"
                                    }`}>
                                      {isComplete ? "Completed" : isUnlocked ? "Ready" : "Locked"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {module.duration ?? 0} mins
                                  </p>
                                  {module.videoUrl ? (
                                    <a href={module.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-medium text-brand-brown hover:text-brand-brown-light">
                                      Watch training video
                                    </a>
                                  ) : null}
                                  {module.resourceUrl ? (
                                    <a href={module.resourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 ml-3 inline-flex text-xs font-medium text-brand-brown hover:text-brand-brown-light">
                                      Open material
                                    </a>
                                  ) : null}
                                  {module.content ? (
                                    <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap text-gray-700">
                                      {module.content}
                                    </div>
                                  ) : null}
                                </div>

                                <form action={completeModule}>
                                  <input type="hidden" name="courseId" value={course.id} />
                                  <input type="hidden" name="moduleId" value={module.id} />
                                  <button
                                    disabled={!isUnlocked || isComplete}
                                    className="rounded-md border border-[#e3bc68] bg-brand-gold px-4 py-2 text-xs font-semibold text-brand-brown disabled:opacity-50"
                                  >
                                    {isComplete ? "Done" : "Mark complete"}
                                  </button>
                                </form>
                              </div>
                            </div>
                          )
                        })}

                        {course.assessments.length > 0 ? (
                          <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-gray-900">Course Assessment</p>
                            <p className="mt-1 text-xs text-gray-500">
                              Complete all modules first. Pass the assessment to finish the course.
                            </p>
                            {course.progressState.modulesComplete ? (
                              <div className="mt-3 space-y-4">
                                {course.assessments.map((assessment) => (
                                  <form key={assessment.id} action={submitAssessment} className="space-y-2">
                                    <input type="hidden" name="assessmentId" value={assessment.id} />
                                    <p className="text-sm font-semibold text-gray-900">{assessment.title}</p>
                                    <p className="text-xs text-gray-500">Pass mark: {assessment.passingScore}%</p>
                                    {(JSON.parse(assessment.questions) as AssessmentQuestion[]).map((question) => (
                                      <div key={question.id}>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">{question.prompt}</label>
                                        <textarea
                                          name={`answer_${question.id}`}
                                          rows={2}
                                          required
                                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        />
                                      </div>
                                    ))}
                                    <button className="rounded-md border border-[#e3bc68] bg-brand-gold px-4 py-2 text-xs font-semibold text-brand-brown">
                                      Submit assessment
                                    </button>
                                  </form>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-gray-500">Finish all modules to unlock the assessment.</p>
                            )}
                          </div>
                        ) : null}

                        {course.enrollment.certificateAwardedAt && course.certificateTitle ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <p className="text-sm font-semibold text-emerald-900">Certificate earned</p>
                            <p className="mt-1 text-sm text-emerald-800">{course.certificateTitle}</p>
                            <p className="mt-1 text-xs text-emerald-700">
                              Awarded {course.enrollment.certificateAwardedAt.toLocaleDateString()}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState label="No academy courses match your learning path yet." />
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="My Milestones" description="Latest completions and certifications.">
            <div className="space-y-3">
              {enrollments.length > 0 ? (
                enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{enrollment.course.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {enrollment.status.replaceAll("_", " ")} • {Math.round(enrollment.progress)}%
                    </p>
                    {enrollment.completedAt ? (
                      <p className="mt-1 text-xs text-emerald-600">
                        Completed {enrollment.completedAt.toLocaleDateString()}
                      </p>
                    ) : null}
                    {enrollment.certificateAwardedAt && enrollment.course.certificateTitle ? (
                      <p className="mt-1 text-xs text-blue-600">
                        Certified: {enrollment.course.certificateTitle}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState label="You have not enrolled in any courses yet." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Assessment Attempts" description="Latest quiz and test records.">
            <div className="space-y-3">
              {attempts.length > 0 ? (
                attempts.map((attempt) => (
                  <div key={attempt.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{attempt.assessment.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{attempt.assessment.course.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {attempt.score != null ? `${Math.round(attempt.score)}%` : "Not graded"} • {attempt.passed ? "Passed" : attempt.completedAt ? "Needs retry" : "In progress"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No assessments attempted yet." />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
