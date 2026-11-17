import { ChevronUp, Download } from "lucide-react"
import { useId, useRef, useState } from "react"
import { EXPORT_KINDS, type ExportKind } from "./export.ts"

const OPTIONS: Record<ExportKind, { label: string; detail: string }> = {
  "svg-zip": { label: "SVG files", detail: "One .svg per icon, zipped" },
  sprite: { label: "Sprite", detail: "One SVG with a symbol per icon" },
  "react-zip": { label: "React", detail: "One .tsx component per icon" },
  variants: { label: "Variants", detail: "Three caps at three weights" },
  sheet: { label: "Figma sheet", detail: "Pastes into Figma as layers" },
}

export function ExportMenu({ onExport }: { onExport: (kind: ExportKind) => void }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const id = useId()
  return (
    <>
      <button
        type="button"
        className="next export-trigger"
        popoverTarget={id}
        aria-expanded={open}
        aria-controls={id}
      >
        <Download aria-hidden="true" />
        Export
        <ChevronUp aria-hidden="true" className="export-chevron" />
      </button>
      <div
        id={id}
        ref={menuRef}
        popover="auto"
        className="menu export-menu"
        onToggle={(event) => {
          const isOpen = event.newState === "open"
          setOpen(isOpen)
          if (isOpen) menuRef.current?.querySelector("button")?.focus()
        }}
      >
        <p className="menu-title">Download as</p>
        <ul>
          {EXPORT_KINDS.map((kind) => (
            <li key={kind}>
              <button
                type="button"
                onClick={() => {
                  menuRef.current?.hidePopover()
                  onExport(kind)
                }}
              >
                <span className="export-label">{OPTIONS[kind].label}</span>
                <span className="export-detail">{OPTIONS[kind].detail}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
