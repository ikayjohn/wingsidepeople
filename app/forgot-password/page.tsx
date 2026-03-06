"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await response.json()) as { message?: string; error?: string }
      if (!response.ok) {
        setError(data.error || "Unable to send reset email.")
        return
      }
      setMessage(data.message || "If that email exists, a reset link has been sent.")
    } catch {
      setError("Unable to send reset email.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <Image src="/logo.png" alt="Wingside" width={80} height={80} className="mb-4" />
          <h2 className="text-center text-3xl font-extrabold text-brand-brown">Forgot Password</h2>
          <p className="mt-2 text-center text-sm text-gray-600">We will email you a password reset link.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none focus:ring-brand-gold"
              placeholder="you@wingside.ng"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md border border-transparent bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <div className="text-center">
            <Link href="/login" className="font-medium text-brand-brown hover:text-brand-brown-light">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

