import { EquipmentCategory, ALL_CATEGORIES, CATEGORY_LABELS } from "../../types/api"

interface CategoryFilterProps {
  selected: EquipmentCategory | ""
  onChange: (category: EquipmentCategory | "") => void
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-1">
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
      {ALL_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat === selected ? "" : cat)}
          className="text-[10px] px-2 py-0.5 rounded-[2px] transition-colors"
          style={{
            background: selected === cat ? "var(--accent)" : "var(--border)",
            color: selected === cat ? "#0A0A0B" : "var(--text-secondary)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {CATEGORY_LABELS[cat].replace(/\s*\(.*\)/, "").substring(0, 10)}
        </button>
      ))}
    </div>
  )
}
