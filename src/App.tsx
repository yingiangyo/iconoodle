import { ArrowLeft, ArrowRight, Eraser, Link, Undo2, X } from "lucide-react"
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { checkSet, driftLabel, type Drift } from "./check.ts"
import { compileIcon, livePath, type Mark } from "./compile.ts"
import {
  ARTBOARD,
  WEIGHTS,
  STORAGE_KEY,
  createSet,
  edit,
  loadSet,
  openSession,
  saveSet,
  type Cleanup,
  type Command,
  type EditResult,
  type Icon,
  type IconId,
  type Sample,
  type Session,
} from "./document.ts"
import { exportSet, type ExportKind } from "./export.ts"
import { ExportMenu } from "./ExportMenu.tsx"
import { Gallery } from "./Gallery.tsx"
import { Guide } from "./Guide.tsx"
import { guideConcept, themeSlots } from "./glyphs.ts"
import { GUIDE_KEY, HINT_KEY, readGuide, readHint } from "./guides.ts"
import { LIBRARIES, libraryInfo, type LibraryId } from "./libraries.ts"
import { Mockup } from "./Mockup.tsx"
import { setFromHash, shareHash } from "./share.ts"
import { THEMES, type ThemePack } from "./themes.ts"

const SIZES = [16, 20, 24, 32] as const

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = loadSet(localStorage)
    return saved ? openSession(saved) : null
  })
  const [picking, setPicking] = useState(() => loadSet(localStorage) === null)
  const [view, setView] = useState<"draw" | "set">("draw")
  const [libraryChoice, setLibraryChoice] = useState<LibraryId>("lucide")
  const [guide, setGuide] = useState(() => readGuide(localStorage))
  const [hint, setHint] = useState(() => readHint(localStorage))
  const [drawing, setDrawing] = useState(false)
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [addDraft, setAddDraft] = useState("")
  const [note, setNote] = useState("")
  const [shared, setShared] = useState(false)
  const [editing, setEditing] = useState(false)
  const [exportError, setExportError] = useState("")
  const [gallery, setGallery] = useState(() => setFromHash(location.hash))
  const sessionRef = useRef(session)
  const pickingRef = useRef(picking)
  const viewRef = useRef(view)
  const editingRef = useRef(editing)
  const stepRef = useRef<(delta: number) => void>(() => {})
  const samplesRef = useRef<Sample[] | null>(null)
  const predictedRef = useRef<Sample[]>([])
  const pointerRef = useRef<number | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const frameRef = useRef<number | null>(null)
  const inkRef = useRef<SVGPathElement | null>(null)
  sessionRef.current = session
  pickingRef.current = picking
  viewRef.current = view
  editingRef.current = editing

  const selected = session
    ? (session.document.icons.find((icon) => icon.id === session.document.selectedId) ??
      session.document.icons[0])
    : null
  const drawn = session ? session.document.icons.filter((icon) => icon.strokes.length > 0).length : 0
  const nameValue = selected ? (nameDraft ?? selected.name) : ""

  useEffect(() => {
    if (!shared) return
    const timer = setTimeout(() => setShared(false), 2000)
    return () => clearTimeout(timer)
  }, [shared])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return
      dropLive()
      setNameDraft(null)
      const saved = loadSet(localStorage)
      if (!saved) {
        sessionRef.current = null
        setSession(null)
        setPicking(true)
        return
      }
      const next = openSession(saved)
      sessionRef.current = next
      setSession(next)
      setPicking(false)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target)) return
      if (event.key === "Escape" && pickingRef.current && sessionRef.current) {
        setPicking(false)
        return
      }
      if (event.key === "Escape" && document.querySelector(":popover-open")) return
      if (event.key === "Escape" && editingRef.current) {
        setEditing(false)
        return
      }
      if (event.key === "Escape" && viewRef.current === "set") {
        setView("draw")
        return
      }
      if (!sessionRef.current || pickingRef.current) return
      if (viewRef.current === "draw" && (event.key === "ArrowRight" || event.key === "Enter")) {
        event.preventDefault()
        stepRef.current(1)
        return
      }
      if (viewRef.current === "draw" && event.key === "ArrowLeft") {
        event.preventDefault()
        stepRef.current(-1)
        return
      }
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
      if (modKey && key === "backspace" && viewRef.current === "draw") {
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
      if (key === "h") toggleGuide()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const flags = useMemo((): ReadonlyMap<IconId, readonly Drift[]> => {
    return session ? checkSet(session.document) : new Map()
  }, [session])

  useEffect(() => {
    function onHash() {
      setGallery(setFromHash(location.hash))
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  const marks = useMemo(() => {
    if (!session) return []
    return session.document.icons.map((icon) => compileIcon(session.document, icon.id))
  }, [session])

  function apply(command: Command): EditResult | null {
    const current = sessionRef.current
    if (!current) return null
    const result = edit(current, command)
    sessionRef.current = result.session
    if (result.session.document !== current.document) {
      saveSet(localStorage, result.session.document)
      setNameDraft(null)
    }
    setSession(result.session)
    return result
  }

  function paintInk() {
    frameRef.current = null
    const samples = samplesRef.current
    const current = sessionRef.current
    if (!samples || !current) return
    const shown = predictedRef.current.length > 0 ? samples.concat(predictedRef.current) : samples
    inkRef.current?.setAttribute("d", livePath(shown, current.document.snap))
  }

  function scheduleInk() {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(paintInk)
  }

  function dropLive() {
    samplesRef.current = null
    predictedRef.current = []
    pointerRef.current = null
    rectRef.current = null
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    inkRef.current?.removeAttribute("d")
    setDrawing(false)
  }

  function commitLive() {
    const current = sessionRef.current
    const samples = samplesRef.current
    dropLive()
    if (!current || !samples || samples.length === 0) return
    const result = apply({ kind: "commit", id: current.document.selectedId, stroke: { samples } })
    if (result?.rejection) setNote("That stroke had no usable points.")
    else dismissHint()
  }

  function dismissHint() {
    setHint((current) => {
      if (!current) return current
      localStorage.setItem(HINT_KEY, "0")
      return false
    })
  }

  function toggleGuide() {
    setGuide((current) => {
      const next = !current
      localStorage.setItem(GUIDE_KEY, next ? "1" : "0")
      return next
    })
  }

  function startTheme(theme: ThemePack, library: LibraryId) {
    const slots = themeSlots(theme.names, library)
    if (slots.length === 0) return
    const next = openSession(createSet(slots, library))
    sessionRef.current = next
    dropLive()
    setNameDraft(null)
    setAddDraft("")
    setNote("")
    setExportError("")
    saveSet(localStorage, next.document)
    setSession(next)
    setView("draw")
    setPicking(false)
  }

  function choose(id: IconId) {
    const current = sessionRef.current
    if (!current || id === current.document.selectedId) return
    commitLive()
    setNote("")
    apply({ kind: "select", id })
  }

  function undo() {
    if (samplesRef.current) {
      dropLive()
      return
    }
    apply({ kind: "undo" })
  }

  function redo() {
    if (samplesRef.current) return
    apply({ kind: "redo" })
  }

  function clearIcon() {
    const current = sessionRef.current
    dropLive()
    if (!current) return
    apply({ kind: "clear", id: current.document.selectedId })
  }

  stepRef.current = (delta: number) => {
    const current = sessionRef.current
    if (!current) return
    const icons = current.document.icons
    const index = icons.findIndex((icon) => icon.id === current.document.selectedId)
    const target = icons[index + delta]
    if (!target) return
    commitLive()
    setNote("")
    if (delta > 0) dismissHint()
    apply({ kind: "select", id: target.id })
  }

  function commitName() {
    if (!selected) return
    const result = apply({ kind: "rename", id: selected.id, name: nameValue.trim() })
    setNameDraft(null)
    if (!result) return
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
    const added = apply({ kind: "add" })
    if (!added) return
    if (typed) {
      const id = added.session.document.selectedId
      const result = apply({ kind: "rename", id, name: typed })
      if (result?.rejection === "invalid-name") setNote("Use lowercase letters, numbers, and single hyphens.")
      else if (result?.rejection === "duplicate-name") setNote("That name is already in the set.")
      else setNote("")
    } else {
      setNote("")
    }
    setAddDraft("")
    showDraw()
  }

  function deleteIcon(id: IconId) {
    const result = apply({ kind: "delete", id })
    setNote(result?.rejection === "last-icon" ? "Keep at least one icon." : "")
  }

  function openIcon(id: IconId) {
    choose(id)
    showDraw()
  }

  function showDraw() {
    setEditing(false)
    setView("draw")
  }

  async function shareSet() {
    const current = sessionRef.current
    if (!current) return
    const url = `${location.origin}${location.pathname}${location.search}#${shareHash(current.document)}`
    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setExportError("")
    } catch {
      setExportError("Could not copy the share link.")
    }
  }

  function setCleanup(patch: Partial<Cleanup>) {
    const current = sessionRef.current
    if (!current) return
    apply({ kind: "cleanup", cleanup: { ...current.document.cleanup, ...patch } })
  }

  async function download(kind: ExportKind) {
    const current = sessionRef.current
    if (!current) return
    setExportError("")
    try {
      const file = await exportSet(current.document, kind)
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
    if (pointerRef.current !== null) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = event.pointerId
    rectRef.current = event.currentTarget.getBoundingClientRect()
    samplesRef.current = appendSamples([], samplesFrom(event.nativeEvent, rectRef.current))
    setDrawing(true)
    scheduleInk()
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const samples = samplesRef.current
    const rect = rectRef.current
    if (pointerRef.current !== event.pointerId || !samples || !rect) return
    appendSamples(samples, samplesFrom(event.nativeEvent, rect))
    predictedRef.current = predictedFrom(event.nativeEvent, rect)
    scheduleInk()
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (pointerRef.current !== event.pointerId) return
    const samples = samplesRef.current
    const rect = rectRef.current
    if (samples && rect) appendSamples(samples, samplesFrom(event.nativeEvent, rect))
    commitLive()
  }

  if (gallery) {
    return (
      <Gallery
        set={gallery}
        onClose={() => {
          history.pushState(null, "", location.pathname + location.search)
          setGallery(null)
        }}
      />
    )
  }

  if (!session || !selected || picking) {
    return (
      <div className="app is-picking">
        <header className="top">
          <div className="brand">
            <Logo />
            <div>
              <h1>iconoodle</h1>
              <p>Hand-drawn icons.</p>
            </div>
          </div>
          {session ? (
            <button type="button" className="toggle" onClick={() => setPicking(false)}>
              Back to drawing
            </button>
          ) : null}
        </header>
        <Suspense fallback={<p className="note">Loading guides.</p>}>
          <ThemePicker
            replacing={session !== null}
            drawn={drawn}
            library={libraryChoice}
            onLibrary={setLibraryChoice}
            onPick={startTheme}
          />
        </Suspense>
        <Colophon library={libraryChoice} />
      </div>
    )
  }

  const selectedIndex = session.document.icons.findIndex((icon) => icon.id === selected.id)
  const selectedMark = marks[selectedIndex] ?? marks[0]
  const previous = selectedIndex > 0 ? session.document.icons[selectedIndex - 1] : null
  const upcoming = session.document.icons[selectedIndex + 1] ?? null
  const canUndo = drawing || session.past.length > 0
  const canClear = drawing || selected.strokes.length > 0
  const selectedFlags = flags.get(selected.id) ?? []
  const selectedGuide = guideConcept(session.document.library, selected.concept, selected.name)
  const trace = guide && selectedGuide ? <Guide library={session.document.library} concept={selectedGuide} /> : null

  if (view === "draw") {
    return (
      <div className="app is-drawing">
        <header className="top draw-top">
          <h1 className="sr">iconoodle</h1>
          <Logo />
          <div className="draw-title">
            <input
              className="name-inline"
              value={nameValue}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
              }}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              enterKeyHint="done"
              aria-label="Icon name"
            />
            <p className="progress">
              {selectedIndex + 1} of {session.document.icons.length}
            </p>
            <p className="sr" aria-live="polite">
              {selected.name}, {selectedIndex + 1} of {session.document.icons.length}
            </p>
          </div>
          <button type="button" className="toggle" onClick={() => setView("set")}>
            Set
          </button>
        </header>
        <Suspense fallback={null}>
        <main className="draw">
          <div className="draw-stage">
            <Peek
              icon={previous}
              mark={previous ? marks[selectedIndex - 1] : null}
              library={session.document.library}
              guide={guide}
              onChoose={previous ? () => choose(previous.id) : undefined}
            />
            <div className="canvas-fit">
              <div className="canvas-frame">
                <Surface
                  name={selected.name}
                  mark={selectedMark}
                  trace={trace}
                  drawing={drawing}
                  inkRef={inkRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                />
              </div>
              <div className="draw-notes">
                {hint && selected.strokes.length === 0 ? <p className="hint">Draw this mark, then Next.</p> : null}
                {selectedFlags.length > 0 ? (
                  <p className="stage-flag">{selectedFlags.map(driftLabel).join(" · ")}</p>
                ) : null}
                {note ? <p className="note">{note}</p> : null}
              </div>
            </div>
            <Peek
              icon={upcoming}
              mark={upcoming ? marks[selectedIndex + 1] : null}
              library={session.document.library}
              guide={guide}
              onChoose={upcoming ? () => choose(upcoming.id) : undefined}
            />
          </div>
          <nav className="draw-actions" aria-label="Drawing">
            <button type="button" aria-label="Back" onClick={() => stepRef.current(-1)} disabled={!previous}>
              <ArrowLeft aria-hidden="true" />
              <span className="action-label">Back</span>
              <kbd>←</kbd>
            </button>
            <button type="button" aria-label="Undo" onClick={undo} disabled={!canUndo}>
              <Undo2 aria-hidden="true" />
              <span className="action-label">Undo</span>
            </button>
            <button type="button" aria-label="Clear" onClick={clearIcon} disabled={!canClear}>
              <Eraser aria-hidden="true" />
              <span className="action-label">Clear</span>
            </button>
            <button
              type="button"
              className="next"
              onClick={() => stepRef.current(1)}
              disabled={!upcoming}
              title={upcoming ? `Next, ${upcoming.name}` : "Last icon"}
              aria-keyshortcuts="Enter ArrowRight"
            >
              <span className="next-label">{upcoming ? `Next ${upcoming.name}` : "Last icon"}</span>
              {upcoming ? <kbd>↵</kbd> : null}
              {upcoming ? <ArrowRight aria-hidden="true" /> : null}
            </button>
          </nav>
        </main>
        </Suspense>
      </div>
    )
  }

  const icons = session.document.icons
  const drawnIcons = icons.flatMap((icon, index) => (icon.strokes.length > 0 ? [{ icon, mark: marks[index] }] : []))

  return (
    <div className="app set-panel">
      <header className="top">
        <div className="brand">
          <Logo />
          <div>
            <h1>iconoodle</h1>
            <p className="progress">
              {drawn} of {icons.length} drawn
            </p>
          </div>
        </div>
        <button type="button" className="toggle" onClick={showDraw}>
          Draw
        </button>
      </header>

      <Suspense fallback={null}>
        <main className="set-body">
          <section className="set-icons" aria-labelledby="set-icons-title">
            <div className="section-head">
              <h2 id="set-icons-title">Icons</h2>
              <button
                type="button"
                className="text-button"
                aria-pressed={editing}
                onClick={() => setEditing((current) => !current)}
              >
                {editing ? "Done" : "Edit"}
              </button>
            </div>
            <ul className={editing ? "slots is-editing" : "slots"}>
              {icons.map((icon, index) => (
                <Slot
                  key={icon.id}
                  icon={icon}
                  mark={marks[index]}
                  library={session.document.library}
                  guide={guide}
                  current={icon.id === selected.id}
                  drifts={flags.get(icon.id) ?? []}
                  editing={editing}
                  canDelete={icons.length > 1}
                  onOpen={() => openIcon(icon.id)}
                  onDelete={() => deleteIcon(icon.id)}
                />
              ))}
            </ul>
            <form className="add-form" onSubmit={addIcon}>
              <input
                value={addDraft}
                onChange={(event) => setAddDraft(event.target.value)}
                placeholder="new-icon"
                aria-label="New icon name"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="go"
              />
              <button type="submit">Add icon</button>
            </form>
          </section>

          <section className="settings" aria-labelledby="settings-title">
            <div className="section-head">
              <h2 id="settings-title">Drawing</h2>
            </div>
            <div className="setting">
              <span className="setting-label">Weight</span>
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
            <div className="setting">
              <span className="setting-label">Assist</span>
              <div className="chips" role="group" aria-label="Drawing assist">
                <button type="button" aria-pressed={guide} onClick={toggleGuide} aria-keyshortcuts="H">
                  Guide
                  <kbd>H</kbd>
                </button>
                <button
                  type="button"
                  aria-pressed={session.document.snap}
                  onClick={() => apply({ kind: "snap", snap: !session.document.snap })}
                  aria-keyshortcuts="G"
                >
                  Snap
                  <kbd>G</kbd>
                </button>
              </div>
            </div>
            <div className="setting">
              <span className="setting-label">Cleanup</span>
              <div className="chips" role="group" aria-label="Stroke cleanup">
                <button
                  type="button"
                  aria-pressed={session.document.cleanup.straight}
                  onClick={() => setCleanup({ straight: !session.document.cleanup.straight })}
                >
                  Straight
                </button>
                <button
                  type="button"
                  aria-pressed={session.document.cleanup.circle}
                  onClick={() => setCleanup({ circle: !session.document.cleanup.circle })}
                >
                  Circle
                </button>
                <button
                  type="button"
                  aria-pressed={session.document.cleanup.close}
                  onClick={() => setCleanup({ close: !session.document.cleanup.close })}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="setting is-stacked">
              <span className="setting-label">Tracing library</span>
              <LibrarySegment
                library={session.document.library}
                onLibrary={(library) => apply({ kind: "library", library })}
              />
              <p className="setting-note">Names stay. Only the tracing picture changes.</p>
            </div>
            <button
              type="button"
              className="new-set"
              onClick={() => {
                setLibraryChoice(session.document.library)
                setPicking(true)
              }}
            >
              New set
            </button>
          </section>

          <section className="preview" aria-labelledby="preview-title">
            <div className="section-head">
              <h2 id="preview-title">Preview</h2>
              <span>16, 20, 24, and 32 on both grounds</span>
            </div>
            {drawnIcons.length > 0 ? (
              <div className="grounds">
                <Ground title="Light" tone="light" items={drawnIcons} onChoose={openIcon} />
                <Ground title="Dark" tone="dark" items={drawnIcons} onChoose={openIcon} />
              </div>
            ) : (
              <p className="empty">Your drawn icons show up here at four sizes, on light and dark.</p>
            )}
          </section>
          <Mockup marks={marks} />
        </main>
      </Suspense>
      <Colophon library={session.document.library} />

      <footer className="set-actions">
        {exportError ? (
          <p className="note" role="alert">
            {exportError}
          </p>
        ) : null}
        <div className="set-actions-row">
          <button type="button" className="share" onClick={() => void shareSet()}>
            <Link aria-hidden="true" />
            {shared ? "Link copied" : "Share link"}
          </button>
          <ExportMenu onExport={(kind) => void download(kind)} />
        </div>
        <p className="sr" aria-live="polite">
          {shared ? "Share link copied." : ""}
        </p>
      </footer>
    </div>
  )
}

function LibrarySegment({ library, onLibrary }: { library: LibraryId; onLibrary: (library: LibraryId) => void }) {
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const row = rowRef.current
    const pressed = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (row && pressed && pressed.offsetLeft + pressed.offsetWidth > row.clientWidth) {
      row.scrollLeft = pressed.offsetLeft - 8
    }
  }, [])
  return (
    <div ref={rowRef} className="segment library-row" role="group" aria-label="Tracing library">
      {LIBRARIES.map((item) => (
        <button key={item.id} type="button" aria-pressed={library === item.id} onClick={() => onLibrary(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

type SlotProps = {
  icon: Icon
  mark: Mark
  library: LibraryId
  guide: boolean
  current: boolean
  drifts: readonly Drift[]
  editing: boolean
  canDelete: boolean
  onOpen: () => void
  onDelete: () => void
}

function Slot({ icon, mark, library, guide, current, drifts, editing, canDelete, onOpen, onDelete }: SlotProps) {
  const isDrawn = icon.strokes.length > 0
  const concept = guide && !isDrawn ? guideConcept(library, icon.concept, icon.name) : null
  const state = isDrawn ? "drawn" : "not drawn"
  return (
    <li className={isDrawn ? "slot-cell is-drawn" : "slot-cell"}>
      <button
        type="button"
        className="slot"
        aria-current={current ? "true" : undefined}
        aria-label={`${icon.name}, ${state}${drifts.length > 0 ? `, ${drifts.map(driftLabel).join(", ")}` : ""}`}
        disabled={editing}
        onClick={onOpen}
      >
        <span className="slot-preview">
          {concept ? (
            <span className="slot-guide">
              <Guide library={library} concept={concept} />
            </span>
          ) : null}
          <MarkView mark={mark} size={36} placeholder={!concept} />
        </span>
        <span className="slot-name">{icon.name}</span>
      </button>
      {drifts.length > 0 && !editing ? (
        <span className="slot-flag" aria-hidden="true">
          {drifts.length}
        </span>
      ) : null}
      {editing && canDelete ? (
        <button type="button" className="slot-remove" aria-label={`Delete ${icon.name}`} onClick={onDelete}>
          <span>
            <X aria-hidden="true" />
          </span>
        </button>
      ) : null}
    </li>
  )
}

function ThemePicker({
  replacing,
  drawn,
  library,
  onLibrary,
  onPick,
}: {
  replacing: boolean
  drawn: number
  library: LibraryId
  onLibrary: (library: LibraryId) => void
  onPick: (theme: ThemePack, library: LibraryId) => void
}) {
  const info = libraryInfo(library)
  return (
    <main className="picker">
      <div className="picker-copy">
        <h2>{replacing ? "New set" : "Start a set"}</h2>
        <p>Choose a library and a product. Each slot arrives named, with a faint outline you can trace.</p>
        <LibrarySegment library={library} onLibrary={onLibrary} />
        <p className="picker-license">
          {info.label} is © {info.holder},{" "}
          <a href={info.licenseUrl} target="_blank" rel="noreferrer">
            {info.license}
          </a>
          .
        </p>
        {replacing && drawn > 0 ? (
          <p className="picker-warn">
            This replaces the current set, including {drawn === 1 ? "the icon already drawn" : `the ${drawn} icons already drawn`}.
          </p>
        ) : null}
      </div>
      <div className="themes">
        {THEMES.map((theme) => {
          const slots = themeSlots(theme.names, library)
          return (
            <button
              key={theme.id}
              type="button"
              className="theme"
              disabled={slots.length === 0}
              onClick={() => onPick(theme, library)}
            >
              <span className="theme-marks" aria-hidden="true">
                {slots.slice(0, 4).map((slot) => (
                  <span key={slot.concept}>
                    <Guide library={library} concept={slot.concept} />
                  </span>
                ))}
              </span>
              <span className="theme-label">{theme.label}</span>
              <span className="theme-blurb">{theme.blurb}</span>
              <span className="theme-names" title={slots.map((slot) => slot.name).join(", ")}>
                {slots.length === 1 ? "1 icon" : `${slots.length} icons`}
                {slots.length > 0 ? ` · ${slots.slice(0, 3).map((slot) => slot.name).join(", ")}` : ""}
              </span>
            </button>
          )
        })}
      </div>
    </main>
  )
}

function Colophon({ library }: { library: LibraryId }) {
  const info = libraryInfo(library)
  return (
    <footer className="colophon">
      Tracing guides are{" "}
      <a href={info.url} target="_blank" rel="noreferrer">
        {info.label}
      </a>{" "}
      icons, © {info.holder},{" "}
      <a href={info.licenseUrl} target="_blank" rel="noreferrer">
        {info.license} license
      </a>
      . They are not included in exports.
    </footer>
  )
}

function Peek({
  icon,
  mark,
  library,
  guide,
  onChoose,
}: {
  icon: Icon | null
  mark: Mark | null
  library: LibraryId
  guide: boolean
  onChoose?: () => void
}) {
  if (!icon || !mark) return <span className="peek is-empty" />
  const concept = guideConcept(library, icon.concept, icon.name)
  return (
    <button type="button" className="peek" onClick={onChoose}>
      <span className="peek-mark">
        {guide && icon.strokes.length === 0 && concept ? (
          <span className="slot-guide">
            <Guide library={library} concept={concept} />
          </span>
        ) : null}
        <MarkView mark={mark} size={56} placeholder={!concept} />
      </span>
      <span>{icon.name}</span>
    </button>
  )
}

type GroundItem = { icon: Icon; mark: Mark }

function Ground({
  title,
  tone,
  items,
  onChoose,
}: {
  title: string
  tone: "light" | "dark"
  items: readonly GroundItem[]
  onChoose: (id: IconId) => void
}) {
  return (
    <div className={`ground ${tone}`}>
      <h3>{title}</h3>
      {SIZES.map((size) => (
        <div className="strip" key={size}>
          <span className="strip-size">{size}</span>
          <div className="strip-icons">
            {items.map(({ icon, mark }) => (
              <button
                key={`${icon.id}-${size}`}
                type="button"
                className="strip-cell"
                aria-label={`${icon.name} at ${size}`}
                title={icon.name}
                onClick={() => onChoose(icon.id)}
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

type SurfaceProps = {
  name: string
  mark: Mark | undefined
  trace: ReactNode
  drawing: boolean
  inkRef: RefObject<SVGPathElement | null>
  onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void
  onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void
}

function Surface({ name, mark, trace, drawing, inkRef, onPointerDown, onPointerMove, onPointerUp }: SurfaceProps) {
  return (
    <div className="canvas-stack">
      {trace ? (
        <div className="trace" aria-hidden="true">
          {trace}
        </div>
      ) : null}
      <svg
        className="canvas"
        viewBox={`0 0 ${ARTBOARD} ${ARTBOARD}`}
        role="application"
        aria-label={`Drawing surface for ${name}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Grid />
        <Keyline />
        {mark?.d ? (
          <path
            d={mark.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={mark.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        <path
          ref={inkRef}
          fill="none"
          stroke="currentColor"
          strokeWidth={mark?.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {!mark?.d && !trace && !drawing ? (
          <text x="12" y="13" textAnchor="middle" className="canvas-hint">
            Draw
          </text>
        ) : null}
      </svg>
    </div>
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

function samplesFrom(event: PointerEvent, rect: DOMRect): Sample[] {
  const coalesced = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : []
  return toSamples(coalesced.length > 0 ? coalesced : [event], rect)
}

function predictedFrom(event: PointerEvent, rect: DOMRect): Sample[] {
  return typeof event.getPredictedEvents === "function" ? toSamples(event.getPredictedEvents(), rect) : []
}

function toSamples(points: readonly PointerEvent[], rect: DOMRect): Sample[] {
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

function appendSamples(samples: Sample[], next: readonly Sample[]): Sample[] {
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
