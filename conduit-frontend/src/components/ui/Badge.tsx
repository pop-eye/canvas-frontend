import React from "react"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "green" | "amber" | "red" | "blue" | "violet"
  className?: string
}

const variants: Record<string, string> = {
  default: "bg-[#1E2025] text-[#E8EAED]",
  green: "bg-emerald-900/40 text-emerald-400 border-emerald-700/50",
  amber: "bg-amber-900/40 text-amber-400 border-amber-700/50",
  red: "bg-red-900/40 text-red-400 border-red-700/50",
  blue: "bg-blue-900/40 text-blue-400 border-blue-700/50",
  violet: "bg-violet-900/40 text-violet-400 border-violet-700/50",
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border rounded-[2px] font-mono uppercase tracking-wider ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const variant = confidence >= 0.8 ? "green" : confidence >= 0.6 ? "amber" : "red"
  return (
    <Badge variant={variant}>
      {Math.round(confidence * 100)}%
    </Badge>
  )
}

/** conduit/v1 profile confidence: high / medium / low. */
export function ConfidenceLevelBadge({ level }: { level?: "high" | "medium" | "low" }) {
  if (!level) return null
  const variant = level === "high" ? "green" : level === "medium" ? "amber" : "red"
  return <Badge variant={variant}>{level}</Badge>
}

export function VerifiedBadge({ verified }: { verified?: boolean }) {
  if (verified === true) return <Badge variant="green">verified</Badge>
  if (verified === false) return <Badge variant="amber">unverified</Badge>
  return null
}
