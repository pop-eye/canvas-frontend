import React, { useRef } from "react"
import { Search, X } from "lucide-react"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={13}
        className="absolute left-2.5 pointer-events-none"
        style={{ color: "var(--text-secondary)" }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-7 py-1.5 text-sm rounded-[2px] outline-none border"
        style={{
          background: "var(--bg)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      />
      {value && (
        <button
          onClick={() => { onChange(""); inputRef.current?.focus() }}
          className="absolute right-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={13} style={{ color: "var(--text-secondary)" }} />
        </button>
      )}
    </div>
  )
}
