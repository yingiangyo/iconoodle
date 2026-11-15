import { Suspense, useEffect, useRef, useState } from "react"
import { Guide } from "./Guide.tsx"
import { LIBRARIES, libraryInfo, type GuideChoice, type LibraryId } from "./libraries.ts"

const SHORT: Record<LibraryId, string> = {
  lucide: "Lucide",
  heroicons: "Hero",
  phosphor: "Phosphor",
  tabler: "Tabler",
  material: "Material",
}

export function LibrarySwitch({
  library,
  guide,
  concept,
  onPick,
}: {
  library: LibraryId
  guide: boolean
  concept: string | null
  onPick: (choice: GuideChoice) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const label = guide ? SHORT[library] : "Off"

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="lib-switch" ref={rootRef}>
      <button
        type="button"
        className="lib-chip"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-keyshortcuts="BracketLeft BracketRight"
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </button>
      {open ? (
        <div className="lib-pop" role="dialog" aria-label="Tracing library">
          <p>Same icon, other libraries. [ and ] cycle.</p>
          <Suspense fallback={<p className="lib-wait">Loading previews.</p>}>
          <div className="lib-options">
            {LIBRARIES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={guide && library === item.id}
                onClick={() => {
                  onPick(item.id)
                  setOpen(false)
                }}
              >
                <span className="lib-preview">
                  {concept ? <Guide library={item.id} concept={concept} /> : null}
                </span>
                {item.label}
                <span className="lib-license">{libraryInfo(item.id).license}</span>
              </button>
            ))}
            <button
              type="button"
              aria-pressed={!guide}
              onClick={() => {
                onPick("off")
                setOpen(false)
              }}
            >
              <span className="lib-preview" />
              Off
            </button>
          </div>
          </Suspense>
        </div>
      ) : null}
    </div>
  )
}
