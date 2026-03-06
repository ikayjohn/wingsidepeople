import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import RichTextContent from "@/components/RichTextContent"
import Link from "next/link"
import Navbar from "@/components/Navbar"

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const announcement = await prisma.announcement.findUnique({
    where: { id }
  })

  if (!announcement) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar session={session} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <Link
              href="/announcements"
              className="text-sm text-brand-brown hover:text-brand-brown-light"
            >
              &larr; Back to announcements
            </Link>
          </div>

          <article className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">{announcement.title}</h1>
                {announcement.pinned && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold-light text-brand-brown">
                    Pinned
                  </span>
                )}
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Published on {new Date(announcement.publishedAt).toLocaleDateString()}
              </div>
            </div>
            <div className="px-4 py-6 sm:px-6">
              <RichTextContent content={announcement.content} />
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
