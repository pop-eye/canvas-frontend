import React, { useState, useRef, useEffect } from "react"

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  side?: "top" | "bottom" | "left" | "right"
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), 300)
  }
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const positionClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  }[side]

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={`absolute ${positionClass} z-50 pointer-events-none whitespace-nowrap`}
        >
          <div
            className="bg-[#1A1B1F] border border-[#1E2025] rounded-[2px] px-2 py-1.5 text-xs shadow-xl"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "#E8EAED" }}
          >
            {content}
          </div>
        </div>
      )}
    </div>
  )
}
