import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/Navbar"

type HandbookSectionListItem = {
  id: string
  slug: string
  title: string
}

export default async function HandbookPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const sections: HandbookSectionListItem[] = await prisma.handbookSection.findMany({
    orderBy: { order: 'asc' }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar session={session} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Employee Handbook</h1>
            <p className="mt-2 text-gray-600">
              Your guide to working at Wingside
            </p>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Table of Contents</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Browse through the different sections of our employee handbook
              </p>
            </div>
            {sections && sections.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <Link
                      href={`/handbook/${section.slug}`}
                      className="block hover:bg-gray-50 transition-colors"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center">
                          <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-brand-gold-light text-brand-brown text-sm font-medium mr-4">
                            {index + 1}
                          </span>
                          <p className="text-sm font-medium text-brand-brown">
                            {section.title}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-5 sm:px-6">
                <div className="text-center py-12">
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Handbook coming soon</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    The employee handbook will be available soon.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
