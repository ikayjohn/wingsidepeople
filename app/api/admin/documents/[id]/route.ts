import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { unlink } from "fs/promises"
import { resolveStoredFilePaths } from "@/lib/document-storage"
import { logAudit } from "@/lib/audit"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const { id } = await params
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: "desc" },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch {
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  try {
    const { id } = await params
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          select: { filepath: true },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const allFilepaths = Array.from(new Set([document.filepath, ...document.versions.map((v) => v.filepath)]))
    for (const file of allFilepaths) {
      const { currentPath, legacyPath } = resolveStoredFilePaths(file)
      try {
        await unlink(currentPath)
      } catch {
        try {
          await unlink(legacyPath)
        } catch (err) {
          console.error("Failed to delete file:", err)
        }
      }
    }

    // Delete database record
    await prisma.document.delete({
      where: { id }
    })

    await logAudit({
      userId: session!.user.id,
      action: "delete",
      resource: "document",
      resourceId: id,
      details: { title: document.title, version: document.version },
      ip,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
