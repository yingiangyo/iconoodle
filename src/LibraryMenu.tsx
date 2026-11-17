import { ChevronDown } from "lucide-react"
import { useId, useState } from "react"
import { GUIDE_CHOICES, choiceLabel, type GuideChoice } from "./libraries.ts"
import { LibrarySegment } from "./LibrarySegment.tsx"

export function LibraryMenu({ value, onChoose }: { value: GuideChoice; onChoose: (choice: GuideChoice) => void }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <>
      <button
        type="button"
        className="library-trigger"
        popoverTarget={id}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Tracing library, ${choiceLabel(value)}`}
        aria-keyshortcuts="[ ]"
      >
        {choiceLabel(value, "short")}
        <ChevronDown aria-hidden="true" className="menu-chevron" />
      </button>
      <div
        id={id}
        popover="auto"
        className="menu library-menu"
        onToggle={(event) => setOpen(event.newState === "open")}
      >
        <p className="menu-title">Tracing library</p>
        <LibrarySegment choices={GUIDE_CHOICES} value={value} onChoose={onChoose} />
        <p className="setting-note">
          Names stay. Only the tracing picture changes.
          <span className="menu-keys">
            {" "}
            <kbd>[</kbd> and <kbd>]</kbd> step through.
          </span>
        </p>
      </div>
    </>
  )
}
