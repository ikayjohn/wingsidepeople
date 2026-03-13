import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import { createSurvey } from "@/app/admin/surveys/actions"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"

const SURVEY_TYPE_LABELS: Record<string, string> = {
  onboarding_experience: "Onboarding Experience",
  job_satisfaction: "Job Satisfaction",
  engagement: "Employee Engagement",
  pulse: "Pulse Check",
  exit: "Exit Interview",
  feedback: "General Feedback",
}

export default async function AdminSurveysPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "surveys")) redirect("/admin")
  if (!hasPrismaDelegates("survey", "surveyResponse")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Survey runtime reload required" />
      </div>
    )
  }

  const [surveyTotals, activeSurveys, anonymousSurveys, surveyTypeCounts, surveys] = await Promise.all([
    prisma.survey.count(),
    prisma.survey.count({ where: { isActive: true } }),
    prisma.survey.count({ where: { isAnonymous: true } }),
    prisma.survey.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),
    prisma.survey.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        _count: { select: { responses: true } },
        createdBy: { select: { name: true, preferredName: true, email: true } },
      },
    }),
  ])

  const typeCounts = surveyTypeCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = row._count._all
    return acc
  }, {})
  const exitInterviews = typeCounts.exit ?? 0
  const onboardingExperience = typeCounts.onboarding_experience ?? 0
  const jobSatisfaction = typeCounts.job_satisfaction ?? 0

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Employee Feedback</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Surveys & Exit Interviews</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage onboarding experience surveys, job satisfaction check-ins, employee engagement surveys, and structured exit interview workflows.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Survey templates" value={surveyTotals} tone="blue" />
        <StatCard label="Active now" value={activeSurveys} tone="green" />
        <StatCard label="Onboarding surveys" value={onboardingExperience} tone="amber" />
        <StatCard label="Job satisfaction" value={jobSatisfaction} tone="rose" />
      </section>

      <section className="mb-6">
        <SectionCard title="Create Survey" description="Launch a new employee survey or exit interview.">
          <form action={createSurvey} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input name="title" required placeholder="Survey title" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <select name="type" defaultValue="engagement" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="onboarding_experience">Onboarding Experience</option>
              <option value="job_satisfaction">Job Satisfaction</option>
              <option value="engagement">Engagement</option>
              <option value="pulse">Pulse</option>
              <option value="exit">Exit</option>
              <option value="feedback">Feedback</option>
            </select>
            <div className="flex items-center gap-5 text-sm text-gray-700">
              <label className="flex items-center gap-2"><input type="checkbox" name="isAnonymous" defaultChecked /> Anonymous</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
            </div>
            <textarea name="description" rows={3} placeholder="Description" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <textarea name="questions" rows={5} placeholder="One question per line" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <p className="text-xs text-gray-500 md:col-span-2">
              Suggested uses: onboarding experience for new starter check-ins, job satisfaction for periodic morale reviews, engagement for broader culture surveys, and exit for offboarding interviews.
            </p>
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Create survey</button>
          </form>
        </SectionCard>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Survey Catalog" description="Recent surveys and participation.">
            <div className="space-y-3">
              {surveys.length > 0 ? (
                surveys.map((survey) => (
                  <div key={survey.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{survey.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {SURVEY_TYPE_LABELS[survey.type] || survey.type.replaceAll("_", " ")}
                      </span>
                      {survey.isActive ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Active
                        </span>
                      ) : null}
                    </div>
                    {survey.description ? <p className="mt-2 text-sm text-gray-600">{survey.description}</p> : null}
                    <p className="mt-2 text-xs text-gray-500">
                      {survey._count.responses} response{survey._count.responses === 1 ? "" : "s"} • Created by {survey.createdBy.preferredName || survey.createdBy.name || survey.createdBy.email}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No surveys configured yet." />
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Survey Mix" description="Survey volume by type and confidentiality model.">
          <div className="space-y-4">
            <MetricBar label="Onboarding" value={onboardingExperience} total={Math.max(surveyTotals, 1)} tone="gold" />
            <MetricBar label="Job Satisfaction" value={jobSatisfaction} total={Math.max(surveyTotals, 1)} tone="rose" />
            <MetricBar label="Engagement" value={typeCounts.engagement ?? 0} total={Math.max(surveyTotals, 1)} tone="blue" />
            <MetricBar label="Pulse" value={typeCounts.pulse ?? 0} total={Math.max(surveyTotals, 1)} tone="green" />
            <MetricBar label="Exit" value={exitInterviews} total={Math.max(surveyTotals, 1)} tone="rose" />
            <MetricBar label="Anonymous" value={anonymousSurveys} total={Math.max(surveyTotals, 1)} tone="gold" />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
