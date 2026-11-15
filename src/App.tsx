import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react"
import { compileIcon, type Mark } from "./compile.ts"
import {
  ARTBOARD,
  WEIGHTS,
  STORAGE_KEY,
  edit,
  loadSet,
  openSession,
  saveSet,
  type Command,
  type EditResult,
  type IconId,
  type Sample,
  type Session,
  type Stroke,
} from "./document.ts"
import { EXPORT_KINDS, exportSet, type ExportKind } from "./export.ts"

const SIZES = [16, 20, 24, 32] as const
const EXPORT_LABELS: Record<ExportKind, string> = {
  "svg-zip": "SVG files",
  sprite: "Sprite",
  "react-zip": "React",
}

export default function App() {
  const [session, setSession] = useState<Session>(() => openSession(loadSet(localStorage)))
  const [live, setLive] = useState<Stroke | null>(null)
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [addDraft, setAddDraft] = useState("")
  const [note, setNote] = useState("")
  const [exportError, setExportError] = useState("")
  const sessionRef = useRef(session)
  const liveRef = useRef<Stroke | null>(null)
  const pointerRef = useRef<number | null>(null)
  const slotRefs = useRef(new Map<string, HTMLButtonElement>())
  sessionRef.current = session

  const selected =
    session.document.icons.find((icon) => icon.id === session.document.selectedId) ??
    session.document.icons[0]
  const drawn = session.document.icons.filter((icon) => icon.strokes.length > 0).length
  const mod = useMemo(() => (navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl"), [])

  const nameValue = nameDraft ?? selected.name

  useEffect(() => {
    const node = slotRefs.current.get(selected.id)
    node?.scrollIntoView({ block: "nearest" })
  }, [selected.id])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return
      liveRef.current = null
      setLive(null)
      setNameDraft(null)
      const next = openSession(loadSet(localStorage))
      sessionRef.current = next
      setSession(next)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target)) return
      const key = event.key.toLowerCase()
      const modKey = event.metaKey || event.ctrlKey
      if (modKey && key === "z" && event.shiftKey) {
        event.preventDefault()
        redo()
        return
      }
      if (modKey && key === "z") {
        event.preventDefault()
        undo()
        return
      }
      if (modKey && key === "y") {
        event.preventDefault()
        redo()
        return
      }
      if (modKey && key === "backspace") {
        event.preventDefault()
        clearIcon()
        return
      }
      if (key === "1" || key === "2" || key === "3") {
        const weight = WEIGHTS[Number(key) - 1]
        if (weight) apply({ kind: "weight", weight })
        return
      }
      if (key === "g") apply({ kind: "snap", snap: !sessionRef.current.document.snap })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const marks = useMemo(
    () =>
      session.document.icons.map((icon) =>
        compileIcon(session.document, icon.id, icon.id === selected.id ? live : null),
      ),
    [session.document, selected.id, live],
  )

  function apply(command: Command): EditResult {
    const current = sessionRef.current
    const result = edit(current, command)
    sessionRef.current = result.session
    if (result.session.document !== current.document) {
      saveSet(localStorage, result.session.document)
      setNameDraft(null)
    }
    setSession(result.session)
    return result
  }

  function commitLive() {
    const stroke = liveRef.current
    liveRef.current = null
    pointerRef.current = null
    setLive(null)
    if (!stroke || stroke.samples.length === 0) return
    const result = apply({ kind: "commit", id: sessionRef.current.document.selectedId, stroke })
    if (result.rejection) setNote("That stroke had no usable points.")
  }

  function choose(id: IconId) {
    if (id === sessionRef.current.document.selectedId) return
    commitLive()
    setNote("")
    apply({ kind: "select", id })
  }

  function undo() {
    if (liveRef.current) {
      liveRef.current = null
      pointerRef.current = null
      setLive(null)
      return
    }
    apply({ kind: "undo" })
  }

  function redo() {
    if (liveRef.current) return
    apply({ kind: "redo" })
  }

  function clearIcon() {
    liveRef.current = null
    pointerRef.current = null
    setLive(null)
    apply({ kind: "clear", id: sessionRef.current.document.selectedId })
  }

  function commitName() {
    const result = apply({ kind: "rename", id: selected.id, name: nameValue.trim() })
    setNameDraft(null)
    if (result.rejection === "invalid-name") {
      setNote("Use lowercase letters, numbers, and single hyphens.")
      return
    }
    if (result.rejection === "duplicate-name") {
      setNote("That name is already in the set.")
      return
    }
    setNote("")
  }

  function addIcon(event: FormEvent) {
    event.preventDefault()
    commitLive()
    const typed = addDraft.trim()
    apply({ kind: "add" })
    if (typed) {
      const id = sessionRef.current.document.selectedId
      const result = apply({ kind: "rename", id, name: typed })
      if (result.rejection === "invalid-name") setNote("Use lowercase letters, numbers, and single hyphens.")
      else if (result.rejection === "duplicate-name") setNote("That name is already in the set.")
      else setNote("")
    } else {
      setNote("")
    }
    setAddDraft("")
  }

  function deleteIcon() {
    commitLive()
    const result = apply({ kind: "delete", id: sessionRef.current.document.selectedId })
    setNote(result.rejection === "last-icon" ? "Keep at least one icon." : "")
  }

  async function download(kind: ExportKind) {
    setExportError("")
    try {
      const file = await exportSet(sessionRef.current.document, kind)
      const url = URL.createObjectURL(file.blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = file.filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed")
    }
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = event.pointerId
    const stroke = { samples: samplesFrom(event) }
    liveRef.current = stroke
    setLive(stroke)
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (pointerRef.current !== event.pointerId || !liveRef.current) return
    const stroke = { samples: appendSamples(liveRef.current.samples, samplesFrom(event)) }
    liveRef.current = stroke
    setLive(stroke)
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (pointerRef.current !== event.pointerId) return
    if (liveRef.current) {
      const stroke = { samples: appendSamples(liveRef.current.samples, samplesFrom(event)) }
      liveRef.current = stroke
    }
    commitLive()
  }

  const selectedMark = marks[session.document.icons.findIndex((icon) => icon.id === selected.id)] ?? marks[0]
  const canUndo = live !== null || session.past.length > 0
  const canRedo = live === null && session.future.length > 0
  const canClear = live !== null || selected.strokes.length > 0

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <Logo />
          <div>
            <h1>iconhand</h1>
            <p>Hand-drawn icons.</p>
          </div>
        </div>
        <div className="controls">
          <div className="control">
            <span className="control-label">Weight</span>
            <div className="segment" role="group" aria-label="Stroke weight">
              {WEIGHTS.map((weight) => (
                <button
                  key={weight}
                  type="button"
                  aria-pressed={session.document.weight === weight}
                  onClick={() => apply({ kind: "weight", weight })}
                >
                  {weight}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="toggle"
            aria-pressed={session.document.snap}
            onClick={() => apply({ kind: "snap", snap: !session.document.snap })}
          >
            Snap
          </button>
          <div className="exports">
            {EXPORT_KINDS.map((kind) => (
              <button key={kind} type="button" className="export" onClick={() => void download(kind)}>
                {EXPORT_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="desk">
        <aside className="library">
          <div className="library-head">
            <h2>Set</h2>
            <span>
              {drawn} of {session.document.icons.length} drawn
            </span>
          </div>
          <div className="slots">
            {session.document.icons.map((icon, index) => (
              <button
                key={icon.id}
                type="button"
                ref={(node) => {
                  if (node) slotRefs.current.set(icon.id, node)
                  else slotRefs.current.delete(icon.id)
                }}
                className={icon.id === selected.id ? "slot is-selected" : "slot"}
                onClick={() => choose(icon.id)}
              >
                <span className="slot-preview">
                  <MarkView mark={marks[index]} size={36} placeholder />
                </span>
                <span className="slot-name">{icon.name}</span>
                {icon.strokes.length > 0 ? <span className="slot-dot" /> : null}
              </button>
            ))}
          </div>
          <form className="add-form" onSubmit={addIcon}>
            <input
              value={addDraft}
              onChange={(event) => setAddDraft(event.target.value)}
              placeholder="new-icon"
              aria-label="New icon name"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button type="submit">Add</button>
          </form>
        </aside>

        <section className="stage">
          <div className="stage-card">
            <label className="name-field">
              <span>Name</span>
              <input
                value={nameValue}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={commitName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur()
                }}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                aria-label="Icon name"
              />
            </label>
            <div className="canvas-frame">
              <svg
                className="canvas"
                viewBox={`0 0 ${ARTBOARD} ${ARTBOARD}`}
                role="application"
                aria-label={`Drawing surface for ${selected.name}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onContextMenu={(event) => event.preventDefault()}
              >
                <Grid />
                <Keyline />
                {selectedMark?.d ? (
                  <path
                    d={selectedMark.d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={selectedMark.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {!selectedMark?.d ? (
                  <text x="12" y="13" textAnchor="middle" className="canvas-hint">
                    Draw
                  </text>
                ) : null}
              </svg>
              {session.document.snap ? <span className="snap-flag">Snap on</span> : null}
            </div>
            <div className="tools">
              <button type="button" onClick={undo} disabled={!canUndo}>
                Undo
                <kbd>{mod}+Z</kbd>
              </button>
              <button type="button" onClick={redo} disabled={!canRedo}>
                Redo
                <kbd>{mod}+⇧Z</kbd>
              </button>
              <button type="button" onClick={clearIcon} disabled={!canClear}>
                Clear
                <kbd>{mod}+⌫</kbd>
              </button>
              <button
                type="button"
                className="danger"
                onClick={deleteIcon}
                disabled={session.document.icons.length === 1}
              >
                Delete
              </button>
            </div>
            {note ? <p className="note">{note}</p> : null}
            {exportError ? <p className="note">{exportError}</p> : null}
          </div>
        </section>
      </div>

      <section className="preview" aria-label="Preview">
        <div className="preview-head">
          <h2>Preview</h2>
          <span>16, 20, 24, and 32 on both grounds</span>
        </div>
        <div className="grounds">
          <Ground title="Light" tone="light" marks={marks} names={session.document.icons.map((icon) => icon.name)} ids={session.document.icons.map((icon) => icon.id)} onChoose={choose} />
          <Ground title="Dark" tone="dark" marks={marks} names={session.document.icons.map((icon) => icon.name)} ids={session.document.icons.map((icon) => icon.id)} onChoose={choose} />
        </div>
      </section>
    </div>
  )
}

function Ground({
  title,
  tone,
  marks,
  names,
  ids,
  onChoose,
}: {
  title: string
  tone: "light" | "dark"
  marks: readonly Mark[]
  names: readonly string[]
  ids: readonly IconId[]
  onChoose: (id: IconId) => void
}) {
  return (
    <div className={`ground ${tone}`}>
      <h3>{title}</h3>
      {SIZES.map((size) => (
        <div className="strip" key={size}>
          <span className="strip-size">{size}</span>
          <div className="strip-icons">
            {marks.map((mark, index) => (
              <button
                key={`${ids[index]}-${size}`}
                type="button"
                className="strip-cell"
                title={names[index]}
                onClick={() => onChoose(ids[index])}
              >
                <MarkView mark={mark} size={size} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MarkView({ mark, size, placeholder = false }: { mark: Mark; size: number; placeholder?: boolean }) {
  return (
    <svg width={size} height={size} viewBox={mark.viewBox} fill="none" stroke="currentColor" aria-hidden="true">
      {mark.d ? (
        <path d={mark.d} strokeWidth={mark.strokeWidth} strokeLinecap={mark.lineCap} strokeLinejoin={mark.lineJoin} />
      ) : placeholder ? (
        <rect x="4" y="4" width="16" height="16" strokeWidth="0.6" strokeOpacity="0.28" />
      ) : null}
    </svg>
  )
}

function Grid() {
  const lines = []
  for (let index = 0; index <= ARTBOARD; index += 1) {
    const major = index % 6 === 0
    lines.push(
      <line key={`v${index}`} x1={index} y1={0} x2={index} y2={ARTBOARD} className={major ? "grid major" : "grid"} />,
      <line key={`h${index}`} x1={0} y1={index} x2={ARTBOARD} y2={index} className={major ? "grid major" : "grid"} />,
    )
  }
  return <g pointerEvents="none">{lines}</g>
}

function Keyline() {
  const guide = {
    fill: "none",
    stroke: "#c4622d",
    strokeOpacity: 0.55,
    strokeWidth: 1,
    strokeDasharray: "4 4",
    vectorEffect: "non-scaling-stroke" as const,
  }
  return (
    <g pointerEvents="none">
      <rect x="2" y="2" width="20" height="20" {...guide} />
      <circle cx="12" cy="12" r="10" {...guide} />
    </g>
  )
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" />
      <path d="M7 16c2.2-6 4-8 5.2-8 1.4 0 1.6 3 2.8 3 1 0 2-4 3.2-5" />
    </svg>
  )
}

function samplesFrom(event: ReactPointerEvent<SVGSVGElement>): Sample[] {
  const native = event.nativeEvent
  const points = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [native]
  const rect = event.currentTarget.getBoundingClientRect()
  const samples: Sample[] = []
  for (const point of points) {
    const sample = toSample(point.clientX, point.clientY, point.pressure, rect)
    if (sample) samples.push(sample)
  }
  return samples
}

function toSample(
  clientX: number,
  clientY: number,
  pressure: number,
  rect: DOMRect,
): Sample | null {
  if (rect.width <= 0 || rect.height <= 0) return null
  const x = ((clientX - rect.left) / rect.width) * ARTBOARD
  const y = ((clientY - rect.top) / rect.height) * ARTBOARD
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const sensed = pressure > 0 && pressure <= 1 ? pressure : 0.5
  return { x, y, pressure: sensed }
}

function appendSamples(existing: readonly Sample[], next: readonly Sample[]): Sample[] {
  const samples = [...existing]
  for (const sample of next) {
    const previous = samples[samples.length - 1]
    if (previous && Math.hypot(previous.x - sample.x, previous.y - sample.y) < 0.04) continue
    samples.push(sample)
  }
  return samples
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
}
