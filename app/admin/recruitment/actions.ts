"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminSection } from "@/lib/rbac"

const jobSchema = z.object({
  title: z.string().min(2).max(120),
  departmentId: z.string().optional(),
  location: z.string().max(120).optional(),
  employmentType: z.enum(["full_time", "contract", "part_time", "intern"]),
  description: z.string().min(10).max(4000),
  requirements: z.string().max(4000).optional(),
  closingDate: z.string().optional(),
  status: z.enum(["draft", "open", "closed", "filled"]),
})

const applicantSchema = z.object({
  jobOpeningId: z.string().min(1),
  applicantName: z.string().min(2).max(120),
  applicantEmail: z.email(),
  phone: z.string().max(40).optional(),
  stage: z.enum(["applied", "screening", "interview", "assessment", "offer", "hired", "rejected"]),
  rating: z.coerce.number().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
})

async function requireRecruitmentAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "recruitment")) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function createJobOpening(formData: FormData) {
  const session = await requireRecruitmentAccess()
  const parsed = jobSchema.parse({
    title: formData.get("title"),
    departmentId: formData.get("departmentId") || undefined,
    location: formData.get("location") || undefined,
    employmentType: formData.get("employmentType"),
    description: formData.get("description"),
    requirements: formData.get("requirements") || undefined,
    closingDate: formData.get("closingDate") || undefined,
    status: formData.get("status"),
  })

  await prisma.jobOpening.create({
    data: {
      title: parsed.title,
      departmentId: parsed.departmentId || null,
      location: parsed.location || null,
      employmentType: parsed.employmentType,
      description: parsed.description,
      requirements: parsed.requirements || null,
      status: parsed.status,
      closingDate: parsed.closingDate ? new Date(`${parsed.closingDate}T00:00:00.000Z`) : null,
      postedById: session.user.id,
    },
  })

  revalidatePath("/admin/recruitment")
}

export async function addApplicant(formData: FormData) {
  await requireRecruitmentAccess()
  const parsed = applicantSchema.parse({
    jobOpeningId: formData.get("jobOpeningId"),
    applicantName: formData.get("applicantName"),
    applicantEmail: formData.get("applicantEmail"),
    phone: formData.get("phone") || undefined,
    stage: formData.get("stage"),
    rating: formData.get("rating") || undefined,
    notes: formData.get("notes") || undefined,
  })

  await prisma.jobApplication.create({
    data: {
      jobOpeningId: parsed.jobOpeningId,
      applicantName: parsed.applicantName,
      applicantEmail: parsed.applicantEmail,
      phone: parsed.phone || null,
      stage: parsed.stage,
      rating: parsed.rating ?? null,
      notes: parsed.notes || null,
    },
  })

  revalidatePath("/admin/recruitment")
}

export async function updateApplicantStage(formData: FormData) {
  await requireRecruitmentAccess()
  const id = z.string().min(1).parse(formData.get("id"))
  const stage = z.enum(["applied", "screening", "interview", "assessment", "offer", "hired", "rejected"]).parse(formData.get("stage"))

  await prisma.jobApplication.update({
    where: { id },
    data: { stage },
  })

  revalidatePath("/admin/recruitment")
}
