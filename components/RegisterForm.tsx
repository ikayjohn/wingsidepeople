"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { getRoleOptionsByDepartment, type OrgRoleRecord } from "@/lib/org-structure"

type RegisterFormProps = {
  workLocations: string[]
  orgDepartments: string[]
  orgRoles: OrgRoleRecord[]
  companyName: string
  companyTagline: string | null
  supportEmail: string | null
  allowedEmailDomain: string
  employeeIdPrefix: string
  employeeIdDigits: number
  passwordMinLength: number
  allowSelfServiceRegistration: boolean
  defaultEmploymentType: string
}

export default function RegisterForm({
  workLocations,
  orgDepartments,
  orgRoles,
  companyName,
  companyTagline,
  supportEmail,
  allowedEmailDomain,
  employeeIdPrefix,
  employeeIdDigits,
  passwordMinLength,
  allowSelfServiceRegistration,
  defaultEmploymentType,
}: RegisterFormProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [email, setEmail] = useState("")
  const [gender, setGender] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [birthday, setBirthday] = useState("")
  const [department, setDepartment] = useState("")
  const [position, setPosition] = useState("")
  const [employmentType, setEmploymentType] = useState(defaultEmploymentType || "full_time")
  const [workLocation, setWorkLocation] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const availableRoles = useMemo(() => getRoleOptionsByDepartment(orgRoles, department), [department, orgRoles])
  const employeeIdPattern = useMemo(
    () => `^${employeeIdPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d{${employeeIdDigits}}$`,
    [employeeIdDigits, employeeIdPrefix]
  )
  const employeeIdRegex = useMemo(() => new RegExp(employeeIdPattern), [employeeIdPattern])
  const employeeIdExample = useMemo(
    () => `${employeeIdPrefix}${"0".repeat(Math.max(1, employeeIdDigits))}`,
    [employeeIdDigits, employeeIdPrefix]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!allowSelfServiceRegistration) {
      setError("Self-service registration is currently disabled. Contact HR to create your account.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!email.toLowerCase().endsWith(`@${allowedEmailDomain.toLowerCase()}`)) {
      setError(`Email must be from ${allowedEmailDomain}`)
      return
    }

    if (password.length < passwordMinLength) {
      setError(`Password must be at least ${passwordMinLength} characters`)
      return
    }

    if (!employeeIdRegex.test(employeeId.trim().toUpperCase())) {
      setError(`Employee ID must use the format ${employeeIdExample}`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          employeeId: employeeId.trim().toUpperCase(),
          email,
          gender,
          phone,
          address,
          birthday,
          department,
          position,
          employmentType,
          workLocation,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Registration failed")
        return
      }

      router.push("/login?registered=true&approval=pending")
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen bg-gray-50 lg:grid lg:grid-cols-2">
      <div className="relative hidden h-screen lg:block">
        <Image
          src="/register.jpg"
          alt="Wingside Register"
          fill
          sizes="50vw"
          className="object-cover object-center"
        />
      </div>
      <div className="h-screen overflow-y-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex min-h-full items-start justify-center">
      <div className="w-full max-w-[36.5rem] space-y-8">
        <div className="flex flex-col items-center">
          <Image src="/logo.png" alt={companyName} width={80} height={80} className="mb-4" />
          <h2 className="text-center text-3xl font-extrabold text-brand-brown">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {companyTagline || `${companyName} Employees Portal`}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input id="firstName" name="firstName" type="text" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input id="lastName" name="lastName" type="text" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                  Employee ID
                </label>
                <input id="employeeId" name="employeeId" type="text" required pattern={employeeIdPattern} className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" placeholder={employeeIdExample} value={employeeId} onChange={(e) => setEmployeeId(e.target.value.toUpperCase())} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="workLocation" className="block text-sm font-medium text-gray-700">
                  Work Location
                </label>
                <select id="workLocation" name="workLocation" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)}>
                  <option value="">Select work location</option>
                  {workLocations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input id="email" name="email" type="email" autoComplete="email" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" placeholder={`you@${allowedEmailDomain}`} value={email} onChange={(e) => setEmail(e.target.value)} />
                <p className="mt-1 text-xs text-gray-500">
                  Must be a @{allowedEmailDomain} email address
                </p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input id="phone" name="phone" type="tel" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" placeholder="+234..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select id="gender" name="gender" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700">
                  Employment Type
                </label>
                <select id="employmentType" name="employmentType" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">
                  Birthday
                </label>
                <input id="birthday" name="birthday" type="date" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select id="department" name="department" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" value={department} onChange={(e) => {
                  const nextDepartment = e.target.value
                  setDepartment(nextDepartment)
                  const matchingRoles = getRoleOptionsByDepartment(orgRoles, nextDepartment)
                  if (!matchingRoles.some((item) => item.title === position)) {
                    setPosition("")
                  }
                }}>
                  <option value="">Select department</option>
                  {orgDepartments.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select id="position" name="position" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" value={position} onChange={(e) => setPosition(e.target.value)} disabled={!department}>
                  <option value="">{department ? "Select role" : "Select department first"}</option>
                  {availableRoles.map((item) => (
                    <option key={item.title} value={item.title}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Roles follow the current company organization chart.
            </p>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea id="address" name="address" rows={2} className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" placeholder="Residential address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input id="password" name="password" type="password" autoComplete="new-password" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <p className="mt-1 text-xs text-gray-500">Minimum {passwordMinLength} characters</p>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <button type="submit" disabled={loading || !allowSelfServiceRegistration} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-brand-brown bg-brand-gold hover:bg-brand-gold-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold disabled:opacity-50 disabled:cursor-not-allowed">
              {allowSelfServiceRegistration ? (loading ? "Creating account..." : "Create account") : "Registration disabled"}
            </button>
          </div>

          <div className="text-center">
            <Link href="/login" className="font-medium text-brand-brown hover:text-brand-brown-light">
              Already have an account? Sign in
            </Link>
          </div>
          {!allowSelfServiceRegistration && supportEmail ? (
            <p className="text-center text-xs text-gray-500">
              Contact {supportEmail} for account creation assistance.
            </p>
          ) : null}
        </form>
      </div>
      </div>
      </div>
    </div>
  )
}
