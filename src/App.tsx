import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react"
import { checkSet, driftLabel, type Drift } from "./check.ts"
import { compileIcon, type Mark } from "./compile.ts"
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
  type Stroke,
} from "./document.ts"
import { EXPORT_KINDS, exportSet, iconSvg, type ExportKind } from "./export.ts"
import { Gallery } from "./Gallery.tsx"
import { Guide } from "./Guide.tsx"
import { guideConcept, themeSlots } from "./glyphs.ts"
import { GUIDE_KEY, HINT_KEY, readGuide, readHint } from "./guides.ts"
import { LIBRARIES, cycleChoice, libraryInfo, type GuideChoice, type LibraryId } from "./libraries.ts"
import { LibrarySwitch } from "./LibrarySwitch.tsx"
import { usePhone } from "./phone.ts"
import { Drawer } from "vaul"
import "./vaul.css"
import { Mockup } from "./Mockup.tsx"
import { setFromHash, shareHash } from "./share.ts"
import { THEMES, type ThemePack } from "./themes.ts"

const SIZES = [16, 20, 24, 32] as const
const EXPORT_LABELS: Record<ExportKind, string> = {
  "svg-zip": "SVG files",
  sprite: "Sprite",
  "react-zip": "React",
  variants: "Variants",
  sheet: "Figma sheet",
}

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
  const [live, setLive] = useState<Stroke | null>(null)
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [addDraft, setAddDraft] = useState("")
  const [note, setNote] = useState("")
  const [status, setStatus] = useState("")
  const [exportError, setExportError] = useState("")
  const [gallery, setGallery] = useState(() => setFromHash(location.hash))
  const phone = usePhone()
  const sessionRef = useRef(session)
  const pickingRef = useRef(picking)
  const viewRef = useRef(view)
  const guideRef = useRef(guide)
  const stepRef = useRef<(delta: number) => void>(() => {})
  const cycleRef = useRef<(delta: number) => void>(() => {})
  const cardRef = useRef<HTMLDivElement>(null)
  const swipeRef = useRef<{ id: number; x: number; y: number; t: number } | null>(null)
  const swallowRef = useRef(false)
  const contactsRef = useRef(new Map<number, { x: number; y: number; moved: boolean; type: string }>())
  const tapsRef = useRef<number[]>([])
  const multiRef = useRef(false)
  const liveRef = useRef<Stroke | null>(null)
  const pointerRef = useRef<number | null>(null)
  const slotRefs = useRef(new Map<string, HTMLButtonElement>())
  sessionRef.current = session
  pickingRef.current = picking
  viewRef.current = view
  guideRef.current = guide

  const selected = session
    ? (session.document.icons.find((icon) => icon.id === session.document.selectedId) ??
      session.document.icons[0])
    : null
  const drawn = session ? session.document.icons.filter((icon) => icon.strokes.length > 0).length : 0
  const mod = useMemo(() => (navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl"), [])

  const nameValue = selected ? (nameDraft ?? selected.name) : ""

  useEffect(() => {
    if (!selected) return
    const node = slotRefs.current.get(selected.id)
    node?.scrollIntoView({ block: "nearest" })
  }, [selected])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return
      liveRef.current = null
      setLive(null)
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
      if (!event.metaKey && !event.ctrlKey && (event.key === "]" || event.key === "[")) {
        event.preventDefault()
        cycleRef.current(event.key === "]" ? 1 : -1)
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
    if (!session || !selected) return []
    return session.document.icons.map((icon) =>
      compileIcon(session.document, icon.id, icon.id === selected.id ? live : null),
    )
  }, [session, selected, live])

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

  function commitLive() {
    const current = sessionRef.current
    const stroke = liveRef.current
    liveRef.current = null
    pointerRef.current = null
    setLive(null)
    if (!current || !stroke || stroke.samples.length === 0) return
    const result = apply({ kind: "commit", id: current.document.selectedId, stroke })
    if (result?.rejection) setNote("That stroke had no usable points.")
    else {
      dismissHint()
      buzz(8)
    }
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
    liveRef.current = null
    pointerRef.current = null
    setLive(null)
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
    const current = sessionRef.current
    liveRef.current = null
    pointerRef.current = null
    setLive(null)
    if (!current) return
    apply({ kind: "clear", id: current.document.selectedId })
  }

  function chooseLibrary(choice: GuideChoice) {
    if (choice === "off") {
      if (!guideRef.current) return
      localStorage.setItem(GUIDE_KEY, "0")
      guideRef.current = false
      setGuide(false)
      return
    }
    const current = sessionRef.current
    if (current && current.document.library !== choice) apply({ kind: "library", library: choice })
    if (!guideRef.current) {
      localStorage.setItem(GUIDE_KEY, "1")
      guideRef.current = true
      setGuide(true)
    }
    buzz(8)
  }

  cycleRef.current = (delta: number) => {
    const current = sessionRef.current
    if (!current) return
    const choice = guideRef.current ? current.document.library : "off"
    chooseLibrary(cycleChoice(choice, delta))
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
  }

  function deleteIcon() {
    const current = sessionRef.current
    commitLive()
    if (!current) return
    const result = apply({ kind: "delete", id: current.document.selectedId })
    setNote(result?.rejection === "last-icon" ? "Keep at least one icon." : "")
  }

  async function copySvg() {
    const current = sessionRef.current
    if (!current) return
    const text = iconSvg(current.document, current.document.selectedId)
    try {
      await navigator.clipboard.writeText(text)
      setStatus("SVG copied.")
      setExportError("")
    } catch {
      setExportError("Could not copy the SVG.")
    }
  }

  async function shareSet() {
    const current = sessionRef.current
    if (!current) return
    const url = `${location.origin}${location.pathname}${location.search}#${shareHash(current.document)}`
    const coarse = window.matchMedia("(pointer: coarse)").matches
    if (coarse && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "iconoodle", text: "A hand-drawn icon set", url })
        setStatus("Share sheet opened.")
        setExportError("")
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setStatus("Share link copied.")
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
      const shared = new File([file.blob], file.filename, { type: file.blob.type || "application/octet-stream" })
      const coarse = window.matchMedia("(pointer: coarse)").matches
      if (coarse && navigator.canShare?.({ files: [shared] })) {
        try {
          await navigator.share({ files: [shared], title: file.filename })
          setStatus("Share sheet opened.")
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return
        }
      }
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

  function penIsDown() {
    for (const contact of contactsRef.current.values()) {
      if (contact.type === "pen") return true
    }
    return false
  }

  function swipeDown(event: ReactPointerEvent<HTMLElement>) {
    if (!swipeZone(event.target)) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    swipeRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now() }
  }

  function swipeMove(event: ReactPointerEvent<HTMLElement>) {
    const start = swipeRef.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dy) > Math.abs(dx)) return
    const card = cardRef.current
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    card.style.transition = "none"
    card.style.transform = `translate3d(${dx}px, 0, 0)`
  }

  function swipeUp(event: ReactPointerEvent<HTMLElement>) {
    const start = swipeRef.current
    if (!start || start.id !== event.pointerId) return
    swipeRef.current = null
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const dt = Math.max(performance.now() - start.t, 1)
    const card = cardRef.current
    const next = dx <= -48 || dx / dt < -0.45
    const back = dx >= 48 || dx / dt > 0.45
    const horizontal = Math.abs(dx) > Math.abs(dy) || Math.abs(dx) >= 48
    const stepped = horizontal && (next || back)
    if (card) {
      card.style.transition = stepped || window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "none"
        : "transform 180ms var(--ease-out)"
      card.style.transform = ""
    }
    if (!stepped) return
    swallowRef.current = true
    stepRef.current(next ? 1 : -1)
    buzz(8)
  }

  function swallowClick(event: { preventDefault(): void; stopPropagation(): void }) {
    if (!swallowRef.current) return
    swallowRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    if (isPalm(event) || (event.pointerType === "touch" && penIsDown())) return
    const drawing = pointerRef.current !== null && contactsRef.current.get(pointerRef.current)?.moved
    if (drawing && event.pointerType === "touch") return
    contactsRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      moved: false,
      type: event.pointerType,
    })
    if (contactsRef.current.size >= 2) {
      multiRef.current = true
      liveRef.current = null
      pointerRef.current = null
      setLive(null)
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = event.pointerId
    const stroke = { samples: samplesFrom(event) }
    liveRef.current = stroke
    setLive(stroke)
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const contact = contactsRef.current.get(event.pointerId)
    if (contact) {
      const dx = event.clientX - contact.x
      const dy = event.clientY - contact.y
      if (dx * dx + dy * dy > 14 * 14) contact.moved = true
    }
    if (contactsRef.current.size >= 2 || multiRef.current) return
    if (pointerRef.current !== event.pointerId || !liveRef.current) return
    const stroke = { samples: appendSamples(liveRef.current.samples, samplesFrom(event)) }
    liveRef.current = stroke
    setLive(stroke)
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const contact = contactsRef.current.get(event.pointerId)
    contactsRef.current.delete(event.pointerId)
    const now = performance.now()
    if (contact && !contact.moved) tapsRef.current.push(now)
    tapsRef.current = tapsRef.current.filter((time) => now - time < 320)
    if (tapsRef.current.length >= 2) {
      tapsRef.current = []
      multiRef.current = false
      liveRef.current = null
      pointerRef.current = null
      setLive(null)
      undo()
      buzz(12)
      return
    }
    if (multiRef.current) {
      if (contactsRef.current.size === 0) multiRef.current = false
      liveRef.current = null
      pointerRef.current = null
      setLive(null)
      return
    }
    if (pointerRef.current !== event.pointerId) return
    if (liveRef.current) {
      const stroke = { samples: appendSamples(liveRef.current.samples, samplesFrom(event)) }
      liveRef.current = stroke
    }
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
  const canUndo = live !== null || session.past.length > 0
  const canRedo = live === null && session.future.length > 0
  const canClear = live !== null || selected.strokes.length > 0
  const selectedFlags = flags.get(selected.id) ?? []
  const selectedGuide = guideConcept(session.document.library, selected.concept, selected.name)

  const drawing = (
      <div className="app is-drawing">
        <header className="top">
          <div className="brand">
            <Logo />
            <div>
              <h1>iconoodle</h1>
              <p className="progress">
                {selectedIndex + 1} of {session.document.icons.length}
              </p>
              <p className="sr" aria-live="polite">
                {selected.name}, {selectedIndex + 1} of {session.document.icons.length}
              </p>
            </div>
          </div>
          <button type="button" className="toggle" onClick={() => setView("set")}>
            Set
          </button>
        </header>
        <Suspense fallback={null}>
        <main
          className="draw"
          onPointerDown={swipeDown}
          onPointerMove={swipeMove}
          onPointerUp={swipeUp}
          onPointerCancel={swipeUp}
          onClickCapture={swallowClick}
        >
          <div className="draw-stage">
            <Peek
              icon={previous}
              mark={previous ? marks[selectedIndex - 1] : null}
              library={session.document.library}
              guide={guide}
              onChoose={previous ? () => choose(previous.id) : undefined}
            />
            <div className="stage-card" ref={cardRef}>
              <label className="name-field">
                <span>Name</span>
                <input
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
              </label>
              <div className="canvas-frame">
                <div className="canvas-stack">
                  {guide && selectedGuide ? (
                    <div className="trace" aria-hidden="true">
                      <Guide library={session.document.library} concept={selectedGuide} />
                    </div>
                  ) : null}
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
                    {!selectedMark?.d && !(guide && selectedGuide) ? (
                      <text x="12" y="13" textAnchor="middle" className="canvas-hint">
                        Draw
                      </text>
                    ) : null}
                  </svg>
                </div>
              </div>
              <div className="stage-foot">
                {hint && selected.strokes.length === 0 ? (
                  <p className="hint">Draw this mark, then Next.</p>
                ) : null}
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
          <div className="draw-actions">
            <button type="button" onClick={() => stepRef.current(-1)} disabled={!previous}>
              Back
              <kbd>←</kbd>
            </button>
            <button type="button" onClick={undo} disabled={!canUndo}>
              Undo
            </button>
            <button type="button" onClick={clearIcon} disabled={!canClear}>
              Clear
            </button>
            <LibrarySwitch
              library={session.document.library}
              guide={guide}
              concept={selectedGuide}
              onPick={chooseLibrary}
            />
            <button
              type="button"
              className="next"
              onClick={() => stepRef.current(1)}
              disabled={!upcoming}
              title={upcoming ? `Next, ${upcoming.name}` : "Last icon"}
              aria-keyshortcuts="Enter ArrowRight"
            >
              {upcoming ? `Next ${upcoming.name}` : "Last icon"}
              {upcoming ? <kbd>↵</kbd> : null}
            </button>
          </div>
          <div className="dock">
            <button type="button" onClick={() => stepRef.current(-1)} disabled={!previous}>
              Back
            </button>
            <button type="button" onClick={undo} disabled={!canUndo}>
              Undo
            </button>
            <LibrarySwitch
              library={session.document.library}
              guide={guide}
              concept={selectedGuide}
              onPick={chooseLibrary}
            />
            <button
              type="button"
              className="next"
              onClick={() => stepRef.current(1)}
              disabled={!upcoming}
              title={upcoming ? `Next, ${upcoming.name}` : "Last icon"}
            >
              {upcoming ? `Next ${upcoming.name}` : "Last"}
            </button>
          </div>
        </main>
        </Suspense>
      </div>
  )

  if (view !== "set") return drawing

  const setPage = (
    <div className="app set-panel">
      <header className="top">
        <div className="brand">
          <Logo />
          <div>
            <h1>iconoodle</h1>
            <p>
              {selectedIndex + 1} of {session.document.icons.length}
            </p>
          </div>
        </div>
        <button type="button" className="next" onClick={() => setView("draw")}>
          Back to drawing
        </button>
      </header>
      <div className="toolbar">
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
            aria-pressed={guide}
            onClick={toggleGuide}
          >
            Guide
            <kbd>H</kbd>
          </button>
          <button
            type="button"
            className="toggle"
            aria-pressed={session.document.snap}
            onClick={() => apply({ kind: "snap", snap: !session.document.snap })}
          >
            Snap
            <kbd>G</kbd>
          </button>
          <div className="exports">
            {EXPORT_KINDS.map((kind) => (
              <button key={kind} type="button" className="export" onClick={() => void download(kind)}>
                {EXPORT_LABELS[kind]}
              </button>
            ))}
            <button type="button" className="export" onClick={() => void shareSet()}>
              Share
            </button>
          </div>
      </div>

      <Suspense fallback={null}>
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
                title={icon.name}
                onClick={() => choose(icon.id)}
              >
                <span className="slot-preview">
                  {guide && icon.strokes.length === 0 && guideConcept(session.document.library, icon.concept, icon.name) ? (
                    <span className="slot-guide">
                      <Guide
                        library={session.document.library}
                        concept={guideConcept(session.document.library, icon.concept, icon.name) ?? icon.concept}
                      />
                    </span>
                  ) : null}
                  <MarkView
                    mark={marks[index]}
                    size={36}
                    placeholder={!(guide && icon.strokes.length === 0 && guideConcept(session.document.library, icon.concept, icon.name))}
                  />
                </span>
                <span className="slot-name">{icon.name}</span>
                {icon.strokes.length > 0 ? <span className="slot-dot" /> : null}
                {(flags.get(icon.id)?.length ?? 0) > 0 ? (
                  <span className="slot-flag" title={(flags.get(icon.id) ?? []).map(driftLabel).join(". ")}>
                    {(flags.get(icon.id) ?? []).length}
                  </span>
                ) : null}
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
          <div className="library-switch">
            <span className="control-label">Tracing library</span>
            <div className="segment" role="group" aria-label="Tracing library">
              {LIBRARIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={session.document.library === item.id}
                  onClick={() => apply({ kind: "library", library: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p>Names stay. Only the tracing picture changes.</p>
          </div>
          <button
            type="button"
            className="new-set"
            onClick={() => {
              commitLive()
              setLibraryChoice(session.document.library)
              setPicking(true)
            }}
          >
            New set
          </button>
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
              <div className="canvas-stack">
              {guide && selectedGuide ? (
                <div className="trace" aria-hidden="true">
                  <Guide library={session.document.library} concept={selectedGuide} />
                </div>
              ) : null}
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
                {!selectedMark?.d && !(guide && selectedGuide) ? (
                  <text x="12" y="13" textAnchor="middle" className="canvas-hint">
                    Draw
                  </text>
                ) : null}
              </svg>
              </div>
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
              <button type="button" onClick={() => void copySvg()}>
                Copy SVG
              </button>
            </div>
            <div className="tools tidy" role="group" aria-label="Stroke cleanup">
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
            {selectedFlags.length > 0 ? (
              <ul className="drifts">
                {selectedFlags.map((drift) => (
                  <li key={drift.kind}>{driftLabel(drift)}</li>
                ))}
              </ul>
            ) : null}
            {note ? <p className="note">{note}</p> : null}
            {status ? <p className="status">{status}</p> : null}
            {exportError ? <p className="note">{exportError}</p> : null}
          </div>
        </section>
      </div>
      </Suspense>

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
      <Mockup marks={marks} />
      <Colophon library={session.document.library} />
    </div>
  )

  if (!phone) return setPage

  return (
    <>
      {drawing}
      <Drawer.Root
        open
        onOpenChange={(open) => {
          if (!open) setView("draw")
        }}
        shouldScaleBackground={false}
        setBackgroundColorOnScale={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="sheet-overlay" />
          <Drawer.Content className="sheet" aria-describedby={undefined}>
            <Drawer.Handle className="sheet-handle" />
            <div className="sheet-bar">
                <Drawer.Title className="sheet-title">Set</Drawer.Title>
              <Drawer.Close className="toggle">Done</Drawer.Close>
            </div>
            <div className="sheet-scroll">{setPage}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
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
        <div className="segment library-pick" role="group" aria-label="Tracing library">
          {LIBRARIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={library === item.id}
              onClick={() => onLibrary(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
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
  const coalesced = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : []
  const points = coalesced.length > 0 ? coalesced : [native]
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

function buzz(ms: number) {
  if (typeof navigator.vibrate === "function") navigator.vibrate(ms)
}

function isPalm(event: ReactPointerEvent<SVGSVGElement>): boolean {
  if (event.pointerType !== "touch") return false
  return event.nativeEvent.width > 40 || event.nativeEvent.height > 40
}

function swipeZone(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest(".canvas, .lib-pop, input, textarea, a")) return false
  return Boolean(target.closest(".draw-actions, .dock, .stage-foot"))
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
}
