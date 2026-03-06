import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
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
    const document = await prisma.document.findUnique({ where: { id } })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const { currentPath, legacyPath } = resolveStoredFilePaths(document.filepath)

    let buffer: Buffer
    try {
      buffer = await readFile(currentPath)
    } catch {
      buffer = await readFile(legacyPath)
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimetype || "application/octet-stream",
        "Content-Disposition": `inline; filename="${document.filename}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 })
  }
}

