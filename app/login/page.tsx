"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { canAccessAdminArea } from "@/lib/rbac"

type PostLoginStatusResponse = {
  authenticated?: boolean
  status?: string
  role?: string | null
}

type AccountStatusResponse = {
  exists?: boolean
  status?: string
  hasLegacyPassword?: boolean
}

async function resolvePostLoginOutcome() {
  const response = await fetch("/api/auth/post-login-status", { cache: "no-store" })
  if (!response.ok) return { path: "/dashboard" }

  const data = (await response.json()) as PostLoginStatusResponse
  if (data.status === "pending_approval") {
    return { error: "Your account is pending admin approval." }
  }
  if (data.status === "rejected") {
    return { error: "Your account registration was rejected. Contact HR/admin." }
  }
  if (data.status && data.status !== "active") {
    return { error: "Your account is not active. Contact admin." }
  }

  const path = canAccessAdminArea(data.role) ? "/admin" : "/dashboard"
  return { path }
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(searchParams.get("approval") === "pending"
    ? "Registration submitted. Wait for admin approval before signing in."
    : "")
  const [loading, setLoading] = useState(false)

  async function getAccountStatus(email: string) {
    const response = await fetch("/api/auth/account-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    if (!response.ok) return null
    return (await response.json()) as AccountStatusResponse
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const accountStatus = await getAccountStatus(email)
        if (accountStatus?.exists) {
          if (accountStatus.status === "pending_approval") {
            setError("Your account is pending admin approval.")
            return
          }
          if (accountStatus.status === "rejected") {
            setError("Your account registration was rejected. Contact HR/admin.")
            return
          }
          if (accountStatus.status && accountStatus.status !== "active") {
            setError("Your account is not active. Contact admin.")
            return
          }
        }

        if (accountStatus?.exists && !accountStatus.hasLegacyPassword) {
          setError("Invalid email or password")
          return
        }

        const migrateResponse = await fetch("/api/auth/migrate-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        if (migrateResponse.ok) {
          const migrateResult = (await migrateResponse.json()) as {
            migrated?: boolean
            reason?: string
          }
          if (migrateResult.migrated) {
            const retry = await supabase.auth.signInWithPassword({ email, password })
            if (!retry.error) {
              const outcome = await resolvePostLoginOutcome()
              if (outcome.error) {
                await supabase.auth.signOut()
                setError(outcome.error)
                return
              }
              router.push(outcome.path || "/dashboard")
              router.refresh()
              return
            }
          }

          if (migrateResult.reason === "no_legacy_user") {
            setError("Account not found. Please register first.")
            return
          }
        }

        if (accountStatus?.exists && accountStatus.status === "active") {
          setError("Invalid email or password")
          return
        }

        setError("Invalid email or password")
      } else {
        const outcome = await resolvePostLoginOutcome()
        if (outcome.error) {
          await supabase.auth.signOut()
          setError(outcome.error)
          return
        }
        router.push(outcome.path || "/dashboard")
        router.refresh()
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <Image src="/logo.png" alt="Wingside" width={80} height={80} className="mb-4" />
          <h2 className="text-center text-3xl font-extrabold text-brand-brown">
            Wingside Employees
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-brand-brown bg-brand-gold hover:bg-brand-gold-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="block mb-2 font-medium text-brand-brown hover:text-brand-brown-light"
            >
              Forgot password?
            </Link>
            <Link
              href="/register"
              className="font-medium text-brand-brown hover:text-brand-brown-light"
            >
              Don&apos;t have an account? Register here
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
