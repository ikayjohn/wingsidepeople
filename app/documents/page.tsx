import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Navbar from "@/components/Navbar"

const categoryLabels: Record<string, string> = {
  forms: 'Forms',
  templates: 'Templates',
  guides: 'Guides',
  policies: 'Policies',
  benefits: 'Benefits',
  training: 'Training',
  other: 'Other',
}

type DocumentItem = {
  id: string
  category: string
  title: string
  version: number
  description: string | null
  filesize: number
}

export default async function DocumentsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const documents: DocumentItem[] = await prisma.document.findMany({
    orderBy: [
      { category: 'asc' },
      { title: 'asc' }
    ]
  })

  const documentsByCategory = documents.reduce<Record<string, DocumentItem[]>>((acc: Record<string, DocumentItem[]>, doc: DocumentItem) => {
    const category = doc.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(doc)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar session={session} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="mt-2 text-gray-600">
              Access forms, templates, and other resources
            </p>
          </div>

          {Object.keys(documentsByCategory).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(documentsByCategory).map(([category, docs]) => (
                <div key={category} className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">
                      {categoryLabels[category] || category}
                    </h2>
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {docs.map((doc) => (
                      <li key={doc.id}>
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block hover:bg-gray-50"
                        >
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-brand-brown">
                                  {doc.title}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">Version {doc.version}</p>
                                {doc.description && (
                                  <p className="mt-1 text-sm text-gray-500">
                                    {doc.description}
                                  </p>
                                )}
                              </div>
                              <span className="ml-4 text-xs text-gray-400">
                                {(doc.filesize / 1024).toFixed(0)} KB
                              </span>
                            </div>
                          </div>
                        </a>
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Documents will be available soon.
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
