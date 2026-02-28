import { useState, useEffect } from "react"
import { useEquipmentList } from "../../hooks/useEquipment"
import { EquipmentCard } from "./EquipmentCard"
import { CategoryFilter } from "./CategoryFilter"
import { SearchInput } from "../ui/SearchInput"
import { EquipmentCategory } from "../../types/api"
import axios from "axios"

export function EquipmentLibrary() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [category, setCategory] = useState<EquipmentCategory | "">("")
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, error } = useEquipmentList({
    search: debouncedSearch || undefined,
    category: category || undefined,
    min_confidence: verifiedOnly ? 0.8 : undefined,
  })

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 space-y-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search equipment…"
        />
        <CategoryFilter selected={category} onChange={setCategory} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVerifiedOnly(false)}
            className="text-xs px-2 py-0.5 rounded-[2px] transition-colors"
            style={{
              background: !verifiedOnly ? "var(--accent)" : "var(--border)",
              color: !verifiedOnly ? "#0A0A0B" : "var(--text-secondary)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            All
          </button>
          <button
            onClick={() => setVerifiedOnly(true)}
            className="text-xs px-2 py-0.5 rounded-[2px] transition-colors"
            style={{
              background: verifiedOnly ? "var(--accent)" : "var(--border)",
              color: verifiedOnly ? "#0A0A0B" : "var(--text-secondary)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Verified (≥80%)
          </button>
        </div>
      </div>

      {/* Equipment list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {error && (() => {
          const is401 = axios.isAxiosError(error) && error.response?.status === 401
          return (
            <div className="p-4 space-y-2" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
              <div className="text-red-400 font-semibold">
                {is401 ? "API authentication required" : "Failed to load equipment"}
              </div>
              {is401 ? (
                <div className="space-y-1 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <div>Your Railway backend has auth enabled.</div>
                  <div className="mt-2 text-amber-400">Option A — disable auth:</div>
                  <div>Remove <span style={{ color: "var(--text-primary)" }}>API_KEY</span> env var from your Railway backend and redeploy.</div>
                  <div className="mt-2 text-amber-400">Option B — add key to frontend:</div>
                  <div>Copy the key value into <span style={{ color: "var(--text-primary)" }}>.env</span> as</div>
                  <div style={{ color: "var(--accent)" }}>VITE_CONDUIT_API_KEY=your-key</div>
                  <div>then restart the dev server.</div>
                </div>
              ) : (
                <div>Check your connection to the CONDUIT API</div>
              )}
            </div>
          )
        })()}

        {!isLoading && !error && data?.records?.length === 0 && (
          <div className="p-4 text-center" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            <div className="mb-1">No equipment found</div>
            <div>Try the Scraper tool to add devices to the database</div>
          </div>
        )}

        {!isLoading &&
          data?.records?.map((record) => (
            <EquipmentCard key={record.id} record={record} />
          ))}
      </div>

      {/* Footer count */}
      {data && (
        <div
          className="px-3 py-2 text-[10px] border-t shrink-0"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {data.records.length} of {data.total} devices
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      className="skeleton-pulse rounded-[2px] p-3 h-16"
      style={{ background: "var(--border)" }}
    />
  )
}
