"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"

interface SearchResults {
  announcements: { id: string; title: string }[]
  handbook: { id: string; title: string; slug: string }[]
  policies: { id: string; title: string; category: string; status: string }[]
  documents: { id: string; title: string; category: string; version: number }[]
  events: { id: string; title: string; category: string; startDate: string }[]
}

export default function SearchBar() {
  const [query, setQuery] = useState("")
  const [type, setType] = useState("all")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string, searchType = type) => {
    if (q.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(searchType)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
        setOpen(true)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [type])

  const handleChange = (value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(value), 300)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasResults = results && (
    results.announcements.length > 0 ||
    results.handbook.length > 0 ||
    results.policies.length > 0 ||
    results.documents.length > 0 ||
    results.events.length > 0
  )

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <select
        value={type}
        onChange={(e) => {
          const nextType = e.target.value
          setType(nextType)
          if (query.length >= 2) search(query, nextType)
        }}
        className="rounded-md border border-brand-brown-lighter bg-brand-brown-light px-2 py-1.5 text-xs text-gray-200 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
      >
        <option value="all">All</option>
        <option value="announcements">Announcements</option>
        <option value="handbook">Handbook</option>
        <option value="policies">Policies</option>
        <option value="documents">Documents</option>
        <option value="events">Events</option>
      </select>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results && setOpen(true)}
          className="w-48 lg:w-64 pl-9 pr-3 py-1.5 rounded-md bg-brand-brown-light text-gray-200 placeholder-gray-400 text-sm border border-brand-brown-lighter focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {hasResults ? (
            <div className="py-2">
              {results!.announcements.length > 0 && (
                <ResultGroup
                  title="Announcements"
                  items={results!.announcements.map((a) => ({ label: a.title, href: `/announcements/${a.id}` }))}
                  onClose={() => { setOpen(false); setQuery("") }}
                />
              )}
              {results!.handbook.length > 0 && (
                <ResultGroup
                  title="Handbook"
                  items={results!.handbook.map((h) => ({ label: h.title, href: `/handbook/${h.slug}` }))}
                  onClose={() => { setOpen(false); setQuery("") }}
                />
              )}
              {results!.policies.length > 0 && (
                <ResultGroup
                  title="Policies"
                  items={results!.policies.map((p) => ({ label: p.title, href: `/policies/${p.id}` }))}
                  onClose={() => { setOpen(false); setQuery("") }}
                />
              )}
              {results!.documents.length > 0 && (
                <ResultGroup
                  title="Documents"
                  items={results!.documents.map((d) => ({ label: `${d.title} (v${d.version})`, href: `/api/documents/${d.id}/download` }))}
                  onClose={() => { setOpen(false); setQuery("") }}
                />
              )}
              {results!.events.length > 0 && (
                <ResultGroup
                  title="Events"
                  items={results!.events.map((e) => ({
                    label: `${e.title} (${new Date(e.startDate).toLocaleDateString()})`,
                    href: `/calendar?event=${e.id}`,
                  }))}
                  onClose={() => { setOpen(false); setQuery("") }}
                />
              )}
            </div>
          ) : (
            query.length >= 2 && !loading && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function ResultGroup({ title, items, onClose }: { title: string; items: { label: string; href: string }[]; onClose: () => void }) {
  return (
    <div>
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className="block px-3 py-2 text-sm text-gray-700 hover:bg-brand-gold-light hover:text-brand-brown"
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}
