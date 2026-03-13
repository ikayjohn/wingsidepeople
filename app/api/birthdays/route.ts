import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { daysUntil, isSameMonthDay, nextBirthdayDate, yearsSince } from "@/lib/birthday-utils"
import { normalizeUserImage } from "@/lib/avatar"

type BirthdayUser = {
  id: string
  name: string | null
  preferredName: string | null
  department: string | null
  image: string | null
  birthday: Date | null
  employmentStartDate: Date | null
}

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const now = new Date()
  const users: BirthdayUser[] = await prisma.user.findMany({
    where: {
      birthday: { not: null },
      showBirthdayPublicly: true,
      status: { not: "exited" },
    },
    select: {
      id: true,
      name: true,
      preferredName: true,
      department: true,
      image: true,
      birthday: true,
      employmentStartDate: true,
    },
  })

  const normalized = users.map((u) => {
    const birthday = u.birthday!
    const next = nextBirthdayDate(birthday, now)
    const inDays = daysUntil(next, now)
    return {
      ...u,
      image: normalizeUserImage(u.image, u.id),
      inDays,
      nextBirthday: next,
      anniversaryYears: u.employmentStartDate ? yearsSince(u.employmentStartDate, now) : null,
      isToday: isSameMonthDay(birthday, now),
    }
  })

  const todaysBirthdays = normalized
    .filter((u) => u.isToday)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))

  const upcomingBirthdays = normalized
    .filter((u) => u.inDays > 0 && u.inDays <= 7)
    .sort((a, b) => a.inDays - b.inDays)

  const anniversariesThisWeek = normalized
    .filter((u) => u.employmentStartDate && u.anniversaryYears !== null && u.anniversaryYears > 0)
    .filter((u) => {
      const nextAnniversary = nextBirthdayDate(u.employmentStartDate!, now)
      const inDays = daysUntil(nextAnniversary, now)
      return inDays >= 0 && inDays <= 7
    })
    .sort((a, b) => (a.anniversaryYears || 0) - (b.anniversaryYears || 0))

  return NextResponse.json({
    todaysBirthdays,
    upcomingBirthdays,
    anniversariesThisWeek,
  })
}
