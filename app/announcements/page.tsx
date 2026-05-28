import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/Navbar"
import Image from "next/image"

type AnnouncementItem = Awaited<ReturnType<typeof prisma.announcement.findMany>>[number]

export default async function AnnouncementsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const announcements: AnnouncementItem[] = await prisma.announcement.findMany({
    orderBy: [
      { pinned: 'desc' },
      { publishedAt: 'desc' }
    ]
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar session={session} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
            <p className="mt-2 text-gray-600">
              Stay up to date with company news and updates
            </p>
          </div>

          <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="relative h-48 w-full sm:h-56">
              <Image
                src="/people3.jpg"
                alt="Team collaboration"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Culture</p>
                <p className="mt-1 text-lg font-semibold sm:text-xl">Collaboration drives impact across every team.</p>
              </div>
            </div>
          </section>

          <div className="bg-white shadow rounded-lg">
            {announcements && announcements.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {announcements.map((announcement: AnnouncementItem) => (
                  <li key={announcement.id}>
                    <Link
                      href={`/announcements/${announcement.id}`}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              {announcement.pinned && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-gold-light text-brand-brown mr-3">
                                  Pinned
                                </span>
                              )}
                              <p className="text-sm font-medium text-brand-brown">
                                {announcement.title}
                              </p>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <p className="text-sm text-gray-500">
                              {new Date(announcement.publishedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-5 sm:px-6">
                <div className="text-center py-12">
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Check back later for company news and updates.
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
