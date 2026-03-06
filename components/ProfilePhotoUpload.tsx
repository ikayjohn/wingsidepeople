"use client"

import { useState, useRef } from "react"
import Image from "next/image"

export default function ProfilePhotoUpload({ image, name }: { image: string | null; name: string | null }) {
  const initialImage = image && image.startsWith("/uploads/avatars/")
    ? "/api/profile/photo"
    : image
  const [currentImage, setCurrentImage] = useState(initialImage)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("photo", file)

      const response = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentImage(data.image + "?t=" + Date.now())
      }
    } catch {
      // silently fail
    } finally {
      setUploading(false)
    }
  }

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {currentImage ? (
          <Image
            src={currentImage}
            alt="Profile"
            width={96}
            height={96}
            className="w-24 h-24 rounded-full object-cover border-2 border-brand-gold"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-brand-gold flex items-center justify-center text-brand-brown text-2xl font-bold">
            {initials}
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 bg-brand-brown text-white rounded-full p-1.5 hover:bg-brand-brown-light"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className="hidden"
      />
      {uploading && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
    </div>
  )
}
