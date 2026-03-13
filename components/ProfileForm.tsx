"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { getRoleOptionsByDepartment, type OrgRoleRecord } from "@/lib/org-structure"

interface ProfileUser {
  name: string | null
  preferredName: string | null
  employeeId: string | null
  gender: string | null
  phone: string | null
  address: string | null
  department: string | null
  position: string | null
  employmentType: string | null
  workLocation: string | null
  employmentStartDate: string | null
  status: string
  showBirthdayPublicly: boolean
  emergencyContact: string | null
  emergencyPhone: string | null
  birthday: string | null
}

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
] as const

const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"] as const

type ProfileFormProps = {
  user: ProfileUser
  workLocations: string[]
  orgDepartments: string[]
  orgRoles: OrgRoleRecord[]
  defaultEmploymentType: string
  employeeIdPrefix: string
  employeeIdDigits: number
}

export default function ProfileForm({
  user,
  workLocations,
  orgDepartments,
  orgRoles,
  defaultEmploymentType,
  employeeIdPrefix,
  employeeIdDigits,
}: ProfileFormProps) {
  const router = useRouter()
  const nameParts = useMemo(() => splitName(user.name), [user.name])
  const [firstName, setFirstName] = useState(nameParts.firstName)
  const [lastName, setLastName] = useState(nameParts.lastName)
  const [preferredName, setPreferredName] = useState(user.preferredName || "")
  const [employeeId, setEmployeeId] = useState(user.employeeId || "")
  const [gender, setGender] = useState(user.gender || "")
  const [phone, setPhone] = useState(user.phone || "")
  const [address, setAddress] = useState(user.address || "")
  const [department, setDepartment] = useState(user.department || "")
  const [position, setPosition] = useState(user.position || "")
  const [employmentType, setEmploymentType] = useState(user.employmentType || defaultEmploymentType || "full_time")
  const [workLocation, setWorkLocation] = useState(user.workLocation || "")
  const [employmentStartDate, setEmploymentStartDate] = useState(user.employmentStartDate || "")
  const [showBirthdayPublicly, setShowBirthdayPublicly] = useState(user.showBirthdayPublicly)
  const [emergencyContact, setEmergencyContact] = useState(user.emergencyContact || "")
  const [emergencyPhone, setEmergencyPhone] = useState(user.emergencyPhone || "")
  const [birthday, setBirthday] = useState(user.birthday || "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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
    setSaving(true)
    setMessage("")
    setError("")

    if (employeeId && !employeeIdRegex.test(employeeId.trim().toUpperCase())) {
      setSaving(false)
      setError(`Employee ID must use the format ${employeeIdExample}`)
      return
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          preferredName: preferredName || null,
          employeeId: employeeId ? employeeId.trim().toUpperCase() : null,
          gender: gender || null,
          phone: phone || null,
          address: address || null,
          department: department || null,
          position: position || null,
          employmentType: employmentType || null,
          workLocation: workLocation || null,
          employmentStartDate: employmentStartDate || null,
          showBirthdayPublicly,
          emergencyContact: emergencyContact || null,
          emergencyPhone: emergencyPhone || null,
          birthday: birthday || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to update profile")
        return
      }

      setMessage("Profile updated successfully")
      router.refresh()
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
        <p className="mt-1 text-sm text-gray-500">Keep your profile aligned with the current company structure and HR settings.</p>
      </div>
      <div className="px-4 py-5 sm:px-6 space-y-4">
        {message ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            />
          </div>
          <div>
            <label htmlFor="preferredName" className="block text-sm font-medium text-gray-700">Preferred Name</label>
            <input
              id="preferredName"
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            />
          </div>
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">Employee ID</label>
            <input
              id="employeeId"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
              placeholder={employeeIdExample}
              pattern={employeeIdPattern}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            />
          </div>
          <div>
            <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700">Employment Type</label>
            <select
              id="employmentType"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
            <select
              id="department"
              value={department}
              onChange={(e) => {
                const nextDepartment = e.target.value
                setDepartment(nextDepartment)
                const matchingRoles = getRoleOptionsByDepartment(orgRoles, nextDepartment)
                if (!matchingRoles.some((item) => item.title === position)) {
                  setPosition("")
                }
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            >
              <option value="">Select department</option>
              {orgDepartments.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700">Role</label>
            <select
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={!department}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold disabled:bg-gray-50"
            >
              <option value="">{department ? "Select role" : "Select department first"}</option>
              {availableRoles.map((item) => (
                <option key={item.title} value={item.title}>{item.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="workLocation" className="block text-sm font-medium text-gray-700">Work Location</label>
            <select
              id="workLocation"
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            >
              <option value="">Select work location</option>
              {workLocations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="employmentStartDate" className="block text-sm font-medium text-gray-700">Employment Start Date</label>
            <input
              id="employmentStartDate"
              type="date"
              value={employmentStartDate}
              onChange={(e) => setEmploymentStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            />
          </div>

          <div>
            <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">Birthday</label>
            <input
              id="birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={showBirthdayPublicly}
                onChange={(e) => setShowBirthdayPublicly(e.target.checked)}
                className="rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
              />
              Show my birthday publicly in the portal
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="mb-3 text-sm font-medium text-gray-900">Emergency Contact</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700">Contact Name</label>
              <input
                id="emergencyContact"
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
              />
            </div>
            <div>
              <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700">Contact Phone</label>
              <input
                id="emergencyPhone"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:ring-brand-gold"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 sm:px-6 bg-gray-50 rounded-b-lg flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  )
}

function splitName(name: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: "", lastName: "" }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}
