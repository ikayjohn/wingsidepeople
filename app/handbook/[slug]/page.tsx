import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import RichTextContent from "@/components/RichTextContent"
import Link from "next/link"
import Navbar from "@/components/Navbar"

export default async function HandbookSectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const section = await prisma.handbookSection.findUnique({
    where: { slug }
  })

  if (!section) {
    notFound()
  }

  const allSections = await prisma.handbookSection.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, slug: true, title: true }
  })

  const currentIndex = allSections.findIndex(s => s.id === section.id)
  const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null
  const nextSection = currentIndex < allSections.length - 1 ? allSections[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar session={session} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <Link
              href="/handbook"
              className="text-sm text-brand-brown hover:text-brand-brown-light"
            >
              &larr; Back to handbook
            </Link>
          </div>

          <article className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h1 className="text-3xl font-bold text-gray-900">{section.title}</h1>
            </div>
            <div className="px-4 py-6 sm:px-6">
              <RichTextContent content={section.content} />
            </div>
            {(prevSection || nextSection) && (
              <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200 flex justify-between">
                {prevSection && (
                  <Link
                    href={`/handbook/${prevSection.slug}`}
                    className="text-brand-brown hover:text-brand-brown-light"
                  >
                    &larr; Previous: {prevSection.title}
                  </Link>
                )}
                {nextSection && (
                  <Link
                    href={`/handbook/${nextSection.slug}`}
                    className="text-brand-brown hover:text-brand-brown-light ml-auto"
                  >
                    Next: {nextSection.title} &rarr;
                  </Link>
                )}
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
