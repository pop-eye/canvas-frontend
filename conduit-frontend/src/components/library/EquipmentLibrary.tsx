import { useState, useEffect, useMemo } from "react"
import { useDeviceIndex } from "../../conduit/useDevices"
import { EquipmentCard } from "./EquipmentCard"
import { CategoryFilter } from "./CategoryFilter"
import { SearchInput } from "../ui/SearchInput"
import type { DeviceIndexEntry } from "../../conduit/source"
import type { DeviceCategory } from "../../conduit/types"

function matches(entry: DeviceIndexEntry, q: string): boolean {
  if (!q) return true
  const hay = [entry.manufacturer, entry.model, entry.model_variant, entry.description, ...(entry.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return hay.includes(q)
}

export function EquipmentLibrary() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [category, setCategory] = useState<DeviceCategory | "">("")
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, error } = useDeviceIndex()
  const allEntries = data?.index.devices ?? []

  // Categories actually present, for the filter pills.
  const availableCategories = useMemo(() => {
    const set = new Set<DeviceCategory>()
    for (const e of allEntries) set.add(e.category)
    return [...set].sort()
  }, [allEntries])

  const filtered = useMemo(
    () =>
      allEntries.filter(
        (e) =>
          matches(e, debouncedSearch) &&
          (category === "" || e.category === category) &&
          (!verifiedOnly || e.verified === true)
      ),
    [allEntries, debouncedSearch, category, verifiedOnly]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 space-y-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search devices…" />
        <CategoryFilter categories={availableCategories} selected={category} onChange={setCategory} />
        <div className="flex items-center gap-2">
          <FilterToggle active={!verifiedOnly} onClick={() => setVerifiedOnly(false)} label="All" />
          <FilterToggle active={verifiedOnly} onClick={() => setVerifiedOnly(true)} label="Verified" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {error && (
          <div className="p-4 space-y-1" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            <div className="text-red-400 font-semibold">Failed to load device library</div>
            <div className="text-[11px]">Check your connection, or the device source URL.</div>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-4 text-center" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            <div className="mb-1">No devices found</div>
            <div className="text-[11px]">Try a different search or category</div>
          </div>
        )}

        {!isLoading && filtered.map((entry) => <EquipmentCard key={entry.id} entry={entry} />)}
      </div>

      {/* Footer */}
      {data && (
        <div
          className="px-3 py-2 text-[10px] border-t shrink-0 flex items-center justify-between"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span>{filtered.length} of {allEntries.length} devices</span>
          <span
            title={data.origin === "remote" ? "Live from conduit-open-standard" : "Bundled snapshot (remote unavailable)"}
            style={{ color: data.origin === "remote" ? "var(--accent)" : "#F59E0B" }}
          >
            {data.origin === "remote" ? "● live" : "● bundled"}
          </span>
        </div>
      )}
    </div>
  )
}

function FilterToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 py-0.5 rounded-[2px] transition-colors"
      style={{
        background: active ? "var(--accent)" : "var(--border)",
        color: active ? "#0A0A0B" : "var(--text-secondary)",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {label}
    </button>
  )
}

function SkeletonCard() {
  return <div className="skeleton-pulse rounded-[2px] p-3 h-16" style={{ background: "var(--border)" }} />
}
