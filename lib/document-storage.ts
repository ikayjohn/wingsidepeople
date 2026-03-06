import path from "path"
import { randomUUID } from "crypto"

export const uploadsDir = path.resolve(process.cwd(), "uploads")
export const legacyUploadsDir = path.resolve(process.cwd(), "public", "uploads")

export function sanitizeOriginalFilename(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_")
}

export function buildStoredFilename(originalName: string) {
  const safeName = sanitizeOriginalFilename(originalName)
  return `${Date.now()}-${safeName}`
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "text/plain": ".txt",
  "text/csv": ".csv",
}

export function isAllowedDocumentMime(mimeType: string) {
  return Object.prototype.hasOwnProperty.call(EXTENSION_BY_MIME, mimeType)
}

export function buildStoredFilenameFromMime(mimeType: string) {
  const ext = EXTENSION_BY_MIME[mimeType]
  if (!ext) throw new Error("Unsupported file type")
  return `${Date.now()}-${randomUUID()}${ext}`
}

export function normalizeStoredFilename(filepath: string) {
  const withoutPrefix = filepath.startsWith("/uploads/")
    ? filepath.slice("/uploads/".length)
    : filepath
  return path.basename(withoutPrefix)
}

export function resolveStoredFilePaths(filepath: string) {
  const filename = normalizeStoredFilename(filepath)
  return {
    filename,
    currentPath: path.resolve(uploadsDir, filename),
    legacyPath: path.resolve(legacyUploadsDir, filename),
  }
}
