import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EmptyState, SectionCard, StatCard } from "@/components/ModuleCards"
import { submitSurveyResponse } from "@/app/surveys/actions"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { createHash } from "crypto"

const SURVEY_TYPE_LABELS: Record<string, string> = {
  onboarding_experience: "Onboarding Experience",
  job_satisfaction: "Job Satisfaction",
  engagement: "Employee Engagement",
  pulse: "Pulse Check",
  exit: "Exit Interview",
  feedback: "General Feedback",
}

type SurveyQuestion = {
  id: string
  prompt: string
}

function anonymousSurveyToken(userId: string, surveyId: string) {
  return createHash("sha256")
    .update(`${surveyId}:${userId}:${process.env.AUTH_SECRET || "wingernet-surveys"}`)
    .digest("hex")
}

export default async function SurveysPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasPrismaDelegates("survey", "surveyResponse")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Survey runtime reload required" />
      </div>
    )
  }

  const [activeSurveys, responses] = await Promise.all([
    prisma.survey.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { responses: true } } },
    }),
    prisma.surveyResponse.findMany({
      where: { userId: session.user.id },
      orderBy: { submittedAt: "desc" },
      take: 8,
      include: {
        survey: { select: { title: true, type: true, isAnonymous: true } },
      },
    }),
  ])

  const exitSurveys = activeSurveys.filter((survey) => survey.type === "exit").length
  const onboardingSurveys = activeSurveys.filter((survey) => survey.type === "onboarding_experience").length
  const activeSurveyIds = activeSurveys.map((survey) => survey.id)
  const anonymousResponses = activeSurveyIds.length
    ? await prisma.surveyResponse.findMany({
        where: {
          surveyId: { in: activeSurveyIds },
          responseToken: {
            in: activeSurveyIds.map((surveyId) => anonymousSurveyToken(session.user.id, surveyId)),
          },
        },
        select: { surveyId: true },
      })
    : []
  const respondedSurveyIds = new Set([
    ...responses.map((response) => response.surveyId),
    ...anonymousResponses.map((response) => response.surveyId),
  ])

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Employee Voice</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Surveys & Exit Interviews</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Stay on top of onboarding experience surveys, job satisfaction check-ins, engagement surveys, and exit interview workflows.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Active surveys" value={activeSurveys.length} />
        <StatCard label="Onboarding" value={onboardingSurveys} tone="blue" />
        <StatCard label="Exit interviews" value={exitSurveys} tone="rose" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Open Surveys" description="Currently active questionnaires and interviews.">
          <div className="space-y-3">
            {activeSurveys.length > 0 ? (
              activeSurveys.map((survey) => (
                <div key={survey.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{survey.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {SURVEY_TYPE_LABELS[survey.type] || survey.type.replaceAll("_", " ")}
                    </span>
                    {survey.isAnonymous ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                        Anonymous
                      </span>
                    ) : null}
                  </div>
                  {survey.description ? <p className="mt-2 text-sm text-gray-600">{survey.description}</p> : null}
                  <p className="mt-2 text-xs text-gray-500">
                    {survey._count.responses} response{survey._count.responses === 1 ? "" : "s"} so far
                  </p>
                  {respondedSurveyIds.has(survey.id) ? (
                    <p className="mt-3 text-xs font-medium text-emerald-700">You already submitted this survey.</p>
                  ) : (
                    <form action={submitSurveyResponse} className="mt-3 space-y-2">
                      <input type="hidden" name="surveyId" value={survey.id} />
                      {(JSON.parse(survey.questions) as SurveyQuestion[]).map((question) => (
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
                      <button className="rounded-md border border-[#e3bc68] bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">
                        Submit response
                      </button>
                    </form>
                  )}
                </div>
              ))
            ) : (
              <EmptyState label="There are no active surveys right now." />
            )}
          </div>
        </SectionCard>

        <SectionCard title="My Recent Responses" description="Non-anonymous responses linked to your account.">
          <div className="space-y-3">
            {responses.length > 0 ? (
              responses.map((response) => (
                <div key={response.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">{response.survey.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {SURVEY_TYPE_LABELS[response.survey.type] || response.survey.type.replaceAll("_", " ")} • Submitted {response.submittedAt.toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="No tracked survey responses on your profile yet." />
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
