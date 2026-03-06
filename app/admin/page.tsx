import Link from "next/link"

export default function AdminDashboard() {
  const cards = [
    {
      href: "/admin/employees",
      title: "Approvals",
      description: "Approve new staff signups",
      iconClass: "bg-violet-100 text-violet-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2m12-8a4 4 0 11-8 0 4 4 0 018 0z"
        />
      ),
    },
    {
      href: "/admin/announcements",
      title: "Announcements",
      description: "Company news",
      iconClass: "bg-brand-gold-light text-brand-brown",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
        />
      ),
    },
    {
      href: "/admin/handbook",
      title: "Handbook",
      description: "Employee handbook",
      iconClass: "bg-emerald-100 text-emerald-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      ),
    },
    {
      href: "/admin/policies",
      title: "Policies",
      description: "Company policies",
      iconClass: "bg-amber-100 text-amber-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      ),
    },
    {
      href: "/admin/documents",
      title: "Documents",
      description: "Files and resources",
      iconClass: "bg-sky-100 text-sky-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
        />
      ),
    },
    {
      href: "/admin/onboarding",
      title: "Onboarding",
      description: "Templates and progress",
      iconClass: "bg-indigo-100 text-indigo-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5V4H2v16h5m10 0v-8m0 8H7m10 0h-2M7 20H5m2 0v-8m0 8h2m8-12h-2M7 8h10"
        />
      ),
    },
    {
      href: "/admin/events",
      title: "Events",
      description: "Calendar management",
      iconClass: "bg-rose-100 text-rose-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      ),
    },
    {
      href: "/admin/leave-requests",
      title: "Leave and Requests",
      description: "Review queues",
      iconClass: "bg-cyan-100 text-cyan-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10m-2 8H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2z"
        />
      ),
    },
  ]

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Portal Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage content, documents, events, and review workflows from one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="panel block overflow-hidden p-6">
            <div className="flex items-start gap-4">
              <div className={`rounded-xl p-3 ${card.iconClass}`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {card.icon}
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
