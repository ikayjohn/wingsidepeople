import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
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

export default async function PoliciesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isAdmin = session.user.role === "admin"

  const policies = await prisma.policy.findMany({
    where: isAdmin ? undefined : { status: "published" },
    orderBy: [
      { category: 'asc' },
      { title: 'asc' }
    ]
  })

  const receipts = await prisma.policyAcknowledgment.findMany({
    where: { userId: session.user.id },
    select: { policyId: true },
  })
  const acknowledgedPolicyIds = new Set(receipts.map((r) => r.policyId))

  const policiesByCategory = policies.reduce<Record<string, typeof policies>>((acc, policy) => {
    const category = policy.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(policy)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar session={session} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Company Policies</h1>
            <p className="mt-2 text-gray-600">
              Browse and search company policies
            </p>
          </div>

          {Object.keys(policiesByCategory).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(policiesByCategory).map(([category, policies]) => (
                <div key={category} className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">
                      {categoryLabels[category] || category}
                    </h2>
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {policies.map((policy) => (
                      <li key={policy.id}>
                        <Link
                          href={`/policies/${policy.id}`}
                          className="block hover:bg-gray-50"
                        >
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-brand-brown">
                                    {policy.title}
                                  </p>
                                  {acknowledgedPolicyIds.has(policy.id) ? (
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                      Read
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                      Unread
                                    </span>
                                  )}
                                  {isAdmin && policy.status !== "published" && (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                      {policy.status}
                                    </span>
                                  )}
                                </div>
                                {policy.summary && (
                                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                    {policy.summary}
                                  </p>
                                )}
                              </div>
                              {policy.effectiveDate && (
                                <div className="ml-4 flex-shrink-0">
                                  <span className="text-sm text-gray-500">
                                    Effective: {new Date(policy.effectiveDate).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <div className="text-center py-12">
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No policies yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Company policies will be available soon.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
