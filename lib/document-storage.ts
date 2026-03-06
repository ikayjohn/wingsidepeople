import path from "path"

export const uploadsDir = path.resolve(process.cwd(), "uploads")
export const legacyUploadsDir = path.resolve(process.cwd(), "public", "uploads")

export function sanitizeOriginalFilename(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_")
}

export function buildStoredFilename(originalName: string) {
  const safeName = sanitizeOriginalFilename(originalName)
  return `${Date.now()}-${safeName}`
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

