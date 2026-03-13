import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminArea } from "@/lib/rbac"
import { resolveStoredFilePaths } from "@/lib/document-storage"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    const { id } = await params
    const strategy = await prisma.departmentStrategy.findUnique({
      where: { id },
      include: {
        department: { select: { name: true } },
      },
    })

    if (!strategy) {
      return NextResponse.json({ error: "Strategy document not found" }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { department: true },
    })

    const canAccess =
      canAccessAdminArea(session.user.role) ||
      (user?.department && user.department === strategy.department.name)

    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { currentPath, legacyPath } = resolveStoredFilePaths(strategy.filepath)

    let buffer: Buffer
    try {
      buffer = await readFile(currentPath)
    } catch {
      buffer = await readFile(legacyPath)
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": strategy.mimetype || "application/octet-stream",
        "Content-Disposition": `inline; filename="${strategy.filename}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to download strategy document" }, { status: 500 })
  }
}
