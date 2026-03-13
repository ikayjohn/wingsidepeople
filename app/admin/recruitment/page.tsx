import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import { addApplicant, createJobOpening, updateApplicantStage } from "@/app/admin/recruitment/actions"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"

export default async function AdminRecruitmentPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "recruitment")) redirect("/admin")
  if (!hasPrismaDelegates("jobOpening", "jobApplication")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Recruitment runtime reload required" />
      </div>
    )
  }

  const [jobTotals, applicantTotals, openJobs, draftJobs, jobs, applicants, applicantStageCounts] = await Promise.all([
    prisma.jobOpening.count(),
    prisma.jobApplication.count(),
    prisma.jobOpening.count({ where: { status: "open" } }),
    prisma.jobOpening.count({ where: { status: "draft" } }),
    prisma.jobOpening.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        department: { select: { name: true } },
        _count: { select: { applications: true } },
      },
    }),
    prisma.jobApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        jobOpening: { select: { title: true } },
      },
    }),
    prisma.jobApplication.groupBy({
      by: ["stage"],
      _count: { _all: true },
    }),
  ])
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  const stageCounts = applicantStageCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.stage] = row._count._all
    return acc
  }, {})

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Talent Pipeline</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Recruitment</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Monitor open roles, applicant flow, and hiring stages from one workspace.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Tracked openings" value={jobTotals} />
        <StatCard label="Open roles" value={openJobs} tone="green" />
        <StatCard label="Draft roles" value={draftJobs} tone="amber" />
        <StatCard label="Applicants" value={applicantTotals} tone="blue" />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Create Job Opening" description="Add a new vacancy to the hiring pipeline.">
          <form action={createJobOpening} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input name="title" required placeholder="Role title" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="departmentId" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            <input name="location" placeholder="Location" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="employmentType" defaultValue="full_time" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="full_time">Full time</option>
              <option value="contract">Contract</option>
              <option value="part_time">Part time</option>
              <option value="intern">Intern</option>
            </select>
            <select name="status" defaultValue="open" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="filled">Filled</option>
            </select>
            <input name="closingDate" type="date" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea name="description" required placeholder="Role summary" rows={4} className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <textarea name="requirements" placeholder="Key requirements" rows={3} className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Create opening</button>
          </form>
        </SectionCard>

        <SectionCard title="Add Applicant" description="Manually add a candidate to a role.">
          <form action={addApplicant} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="jobOpeningId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2">
              <option value="">Select job opening</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
            <input name="applicantName" required placeholder="Applicant name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="applicantEmail" required type="email" placeholder="Applicant email" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="phone" placeholder="Phone" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="stage" defaultValue="applied" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="assessment">Assessment</option>
              <option value="offer">Offer</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
            <input name="rating" type="number" min="1" max="5" placeholder="Rating 1-5" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea name="notes" placeholder="Notes" rows={3} className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Add applicant</button>
          </form>
        </SectionCard>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Job Openings" description="Latest roles in the hiring pipeline.">
            <div className="space-y-3">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <div key={job.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {job.department?.name || "No department"} • {job.location || "No location"} • {job.employmentType.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {job._count.applications} applicant{job._count.applications === 1 ? "" : "s"}
                      {job.closingDate ? ` • closes ${job.closingDate.toLocaleDateString()}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No job openings have been created yet." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Recent Applicants" description="Latest candidates and their current stages.">
            <div className="space-y-3">
              {applicants.length > 0 ? (
                applicants.map((applicant) => (
                  <div key={applicant.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{applicant.applicantName}</p>
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                        {applicant.stage}
                      </span>
                      {applicant.rating ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          {applicant.rating}/5
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{applicant.jobOpening.title} • {applicant.applicantEmail}</p>
                    {applicant.notes ? <p className="mt-2 text-sm text-gray-600">{applicant.notes}</p> : null}
                    <form action={updateApplicantStage} className="mt-3 flex gap-2">
                      <input type="hidden" name="id" value={applicant.id} />
                      <select name="stage" defaultValue={applicant.stage} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs">
                        <option value="applied">Applied</option>
                        <option value="screening">Screening</option>
                        <option value="interview">Interview</option>
                        <option value="assessment">Assessment</option>
                        <option value="offer">Offer</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <button className="rounded-md border border-[#e3bc68] bg-brand-gold px-3 py-1.5 text-xs font-semibold text-brand-brown">
                        Update stage
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <EmptyState label="No applicants have been added yet." />
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Hiring Pipeline" description="Applicant count by current stage.">
          <div className="space-y-4">
            {Object.keys(stageCounts).length > 0 ? (
              Object.entries(stageCounts).map(([stage, count]) => (
                <MetricBar key={stage} label={stage.replaceAll("_", " ")} value={count} total={Math.max(applicantTotals, 1)} tone="blue" />
              ))
            ) : (
              <EmptyState label="No applicant pipeline data yet." />
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
