import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import RichTextContent from "@/components/RichTextContent"
import PolicyAcknowledgeButton from "@/components/PolicyAcknowledgeButton"
import Link from "next/link"
import Navbar from "@/components/Navbar"

const categoryLabels: Record<string, string> = {
  hr: 'Human Resources',
  it: 'IT & Security',
  operations: 'Operations',
  finance: 'Finance',
  legal: 'Legal',
  workplace: 'Workplace',
  other: 'Other',
}

export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const policy = await prisma.policy.findUnique({
    where: { id }
  })

  const isAdmin = session.user.role === "admin"

  if (!policy || (!isAdmin && policy.status !== "published")) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar session={session} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <Link
              href="/policies"
              className="text-sm text-brand-brown hover:text-brand-brown-light"
            >
              &larr; Back to policies
            </Link>
          </div>

          <article className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold-light text-brand-brown">
                    {categoryLabels[policy.category] || policy.category}
                  </span>
                  {isAdmin && policy.status !== "published" && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {policy.status}
                    </span>
                  )}
                  <h1 className="mt-3 text-3xl font-bold text-gray-900">{policy.title}</h1>
                </div>
              </div>
              {policy.summary && (
                <p className="mt-2 text-lg text-gray-600">{policy.summary}</p>
              )}
              <div className="mt-4 flex items-center text-sm text-gray-500 space-x-4">
                {policy.effectiveDate && (
                  <span>Effective: {new Date(policy.effectiveDate).toLocaleDateString()}</span>
                )}
                {policy.lastReviewed && (
                  <span>Last reviewed: {new Date(policy.lastReviewed).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="px-4 py-6 sm:px-6">
              <RichTextContent content={policy.content} />
              <PolicyAcknowledgeButton policyId={policy.id} />
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
