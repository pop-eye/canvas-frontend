import type { DeviceCategory } from "../../conduit/types"
import { categoryLabel } from "../../conduit/category"

interface CategoryFilterProps {
  categories: DeviceCategory[]
  selected: DeviceCategory | ""
  onChange: (category: DeviceCategory | "") => void
}

export function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  return (
    <div 
      className="flex gap-1 overflow-x-auto whitespace-nowrap"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style>{`
        .flex::-webkit-scrollbar { display: none; }
      `}</style>
      <button
        onClick={() => onChange("")}
        className="text-[10px] px-2 py-0.5 rounded-[2px] transition-colors"
        style={{
          background: selected === "" ? "var(--accent)" : "var(--border)",
          color: selected === "" ? "#0A0A0B" : "var(--text-secondary)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat === selected ? "" : cat)}
          className="text-[10px] px-2 py-0.5 rounded-[2px] transition-colors"
          style={{
            background: selected === cat ? "var(--accent)" : "var(--border)",
            color: selected === cat ? "#0A0A0B" : "var(--text-secondary)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
          title={categoryLabel(cat)}
        >
          {categoryLabel(cat)}
        </button>
      ))}
    </div>
  )
}
