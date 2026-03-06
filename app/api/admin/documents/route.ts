import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { writeFile, mkdir, unlink } from "fs/promises"
import { buildStoredFilenameFromMime, isAllowedDocumentMime, sanitizeOriginalFilename, uploadsDir } from "@/lib/document-storage"
import path from "path"
import { logAudit } from "@/lib/audit"

const VALID_CATEGORIES = ["forms", "templates", "guides", "policies", "benefits", "training", "other"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const documents = await prisma.document.findMany({
      include: {
        versions: {
          select: { id: true, version: true, createdAt: true },
          orderBy: { version: "desc" },
        },
      },
      orderBy: [
        { category: 'asc' },
        { title: 'asc' }
      ]
    })
    return NextResponse.json(documents)
  } catch {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  let writtenFilePath: string | null = null
  try {
    const formData = await req.formData()
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const category = formData.get("category") as string
    const rawFile = formData.get("file")
    const file = rawFile instanceof File ? rawFile : null
    const documentIdRaw = formData.get("documentId")
    const documentId = typeof documentIdRaw === "string" && documentIdRaw.trim() ? documentIdRaw.trim() : null

    if (!title || !category || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({ error: "Title too long (max 200 characters)" }, { status: 400 })
    }

    if (!isAllowedDocumentMime(file.type)) {
      return NextResponse.json({ error: "File type not allowed. Accepted: PDF, Word, Excel, PowerPoint, images, text, CSV." }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 })
    }

    const safeOriginalName = sanitizeOriginalFilename(file.name)
    const filename = buildStoredFilenameFromMime(file.type)

    await mkdir(uploadsDir, { recursive: true })
    const filepath = path.resolve(uploadsDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)
    writtenFilePath = filepath

    let document
    if (documentId) {
      const existing = await prisma.document.findUnique({
        where: { id: documentId },
      })
      if (!existing) {
        return NextResponse.json({ error: "Document not found for version update" }, { status: 404 })
      }

      const [, updatedDocument] = await prisma.$transaction([
        prisma.documentVersion.create({
          data: {
            documentId: existing.id,
            version: existing.version,
            filename: existing.filename,
            filepath: existing.filepath,
            filesize: existing.filesize,
            mimetype: existing.mimetype,
            createdById: session!.user.id,
          },
        }),
        prisma.document.update({
          where: { id: existing.id },
          data: {
            title,
            description: description || null,
            category,
            filename: safeOriginalName,
            filepath: filename,
            filesize: file.size,
            mimetype: file.type,
            version: { increment: 1 },
            publishedAt: new Date(),
          },
          include: {
            versions: {
              select: { id: true, version: true, createdAt: true },
              orderBy: { version: "desc" },
            },
          },
        }),
      ])
      document = updatedDocument

      await logAudit({
        userId: session!.user.id,
        action: "update",
        resource: "document",
        resourceId: document.id,
        details: { title: document.title, version: document.version },
        ip,
      })
    } else {
      document = await prisma.document.create({
        data: {
          title,
          description: description || null,
          category,
          filename: safeOriginalName,
          filepath: filename,
          filesize: file.size,
          mimetype: file.type,
        },
        include: {
          versions: {
            select: { id: true, version: true, createdAt: true },
            orderBy: { version: "desc" },
          },
        },
      })

      await logAudit({
        userId: session!.user.id,
        action: "create",
        resource: "document",
        resourceId: document.id,
        details: { title: document.title, version: document.version },
        ip,
      })
    }

    return NextResponse.json(document, { status: 201 })
  } catch (err) {
    if (writtenFilePath) {
      try {
        await unlink(writtenFilePath)
      } catch {
        // best-effort cleanup for failed metadata writes
      }
    }
    console.error("Upload error:", err)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
