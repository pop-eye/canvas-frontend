import { useState, useEffect, useMemo, useRef } from "react"
import { Plus } from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual"
import Fuse from "fuse.js"

import { useDeviceIndex } from "../../conduit/useDevices"
import { useCustomDeviceStore, customToIndexEntry } from "../../conduit/customDevices"
import { useRecentDevices } from "../../conduit/useRecentDevices"
import { EquipmentCard } from "./EquipmentCard"
import { CategoryFilter } from "./CategoryFilter"
import { SearchInput } from "../ui/SearchInput"
import { CustomDeviceModal } from "../layout/CustomDeviceModal"
import { DeviceDetailsModal } from "./DeviceDetailsModal"
import type { DeviceCategory } from "../../conduit/types"

export function EquipmentLibrary() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [category, setCategory] = useState<DeviceCategory | "">("")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [previewDeviceId, setPreviewDeviceId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, error } = useDeviceIndex()
  const customEntries = useCustomDeviceStore((s) => s.entries)
  const recentIds = useRecentDevices((s) => s.recentIds)

  const allEntries = useMemo(
    () => [...customEntries.map(customToIndexEntry), ...(data?.index.devices ?? [])],
    [customEntries, data]
  )

  const availableCategories = useMemo(() => {
    const set = new Set<DeviceCategory>()
    for (const e of allEntries) set.add(e.category)
    return [...set].sort()
  }, [allEntries])

  // Fuse search
  const fuse = useMemo(
    () => new Fuse(allEntries, { keys: ["manufacturer", "model", "model_variant", "description", "tags"], threshold: 0.3 }),
    [allEntries]
  )

  const filtered = useMemo(() => {
    let results = allEntries

    if (debouncedSearch) {
      results = fuse.search(debouncedSearch).map((r) => r.item)
    }

    results = results.filter((e) => {
      if (category && e.category !== category) return false
      if (verifiedOnly && !e.verified) return false
      return true
    })

    // Sort to put recents at top if NO search is active
    if (!debouncedSearch && recentIds.length > 0) {
      const recents = new Set(recentIds)
      const recentItems = results.filter((e) => recents.has(e.id))
      // Maintain the order of recentIds
      recentItems.sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id))
      const otherItems = results.filter((e) => !recents.has(e.id))
      results = [...recentItems, ...otherItems]
    }

    return results
  }, [allEntries, fuse, debouncedSearch, category, verifiedOnly, recentIds])

  // Virtualization
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // approximate height of card + gap
    overscan: 5,
  })

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 space-y-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search devices…" /></div>
          <button
            onClick={() => setAddOpen(true)}
            title="Add a custom device"
            className="flex items-center gap-1 px-2 rounded-[2px] shrink-0"
            style={{ color: "var(--accent)", border: "1px solid var(--border)", background: "var(--bg)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
        <CategoryFilter categories={availableCategories} selected={category} onChange={setCategory} />
        <div className="flex items-center gap-2">
          <FilterToggle active={!verifiedOnly} onClick={() => setVerifiedOnly(false)} label="All" />
          <FilterToggle active={verifiedOnly} onClick={() => setVerifiedOnly(true)} label="Verified" />
        </div>
      </div>

      {/* List */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto p-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {isLoading && (
          <div className="space-y-1">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
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

        {!isLoading && filtered.length > 0 && (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const entry = filtered[virtualItem.index]
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingBottom: "4px" // space between cards
                  }}
                >
                  <EquipmentCard 
                    entry={entry} 
                    onClick={() => setPreviewDeviceId(entry.id)}
                  />
                </div>
              )
            })}
          </div>
        )}
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

      <CustomDeviceModal open={addOpen} onClose={() => setAddOpen(false)} />
      <DeviceDetailsModal deviceId={previewDeviceId} onClose={() => setPreviewDeviceId(null)} />
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
