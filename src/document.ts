import { themeSlots } from "./glyphs.ts"
import { isLibraryId, type LibraryId } from "./libraries.ts"
import { THEMES } from "./themes.ts"

export const ARTBOARD = 24

export const WEIGHTS = [1.5, 2, 2.5] as const

export type Weight = (typeof WEIGHTS)[number]

export type IconId = string & { readonly __brand: "IconId" }

export type IconName = string & { readonly __brand: "IconName" }

export type Sample = {
  readonly x: number
  readonly y: number
  readonly pressure: number
}

export type Stroke = {
  readonly samples: readonly Sample[]
}

export type Icon = {
  readonly id: IconId
  readonly name: IconName
  readonly concept: string
  readonly strokes: readonly Stroke[]
}

export type Cleanup = {
  readonly straight: boolean
  readonly circle: boolean
  readonly close: boolean
}

export const CLEANUP_OFF: Cleanup = { straight: false, circle: false, close: false }

export type IconSet = {
  readonly library: LibraryId
  readonly weight: Weight
  readonly snap: boolean
  readonly cleanup: Cleanup
  readonly selectedId: IconId
  readonly icons: readonly [Icon, ...Icon[]]
}

export type Session = {
  readonly document: IconSet
  readonly past: readonly IconSet[]
  readonly future: readonly IconSet[]
}

export type RejectReason =
  | "invalid-name"
  | "duplicate-name"
  | "short-stroke"
  | "last-icon"
  | "missing-icon"

export type EditResult = {
  readonly session: Session
  readonly rejection: RejectReason | null
}

export type Command =
  | { readonly kind: "select"; readonly id: IconId }
  | { readonly kind: "add" }
  | { readonly kind: "rename"; readonly id: IconId; readonly name: string }
  | { readonly kind: "delete"; readonly id: IconId }
  | { readonly kind: "weight"; readonly weight: Weight }
  | { readonly kind: "snap"; readonly snap: boolean }
  | { readonly kind: "cleanup"; readonly cleanup: Cleanup }
  | { readonly kind: "library"; readonly library: LibraryId }
  | { readonly kind: "commit"; readonly id: IconId; readonly stroke: Stroke }
  | { readonly kind: "clear"; readonly id: IconId }
  | { readonly kind: "undo" }
  | { readonly kind: "redo" }

export const STORAGE_KEY = "iconoodle"
const LEGACY_KEY = "iconhand"
const HISTORY_LIMIT = 100
const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export function isIconId(value: string): value is IconId {
  return value.length > 0 && !/\s/.test(value)
}

export function isIconName(value: string): value is IconName {
  return NAME_PATTERN.test(value)
}

export function isWeight(value: unknown): value is Weight {
  return WEIGHTS.some((weight) => weight === value)
}

export function loadSet(storage: Pick<Storage, "getItem">): IconSet | null {
  const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_KEY)
  if (raw === null) return null
  try {
    return parseSet(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveSet(storage: Pick<Storage, "setItem">, set: IconSet): void {
  storage.setItem(STORAGE_KEY, setToJSON(set))
}

export function setToJSON(set: IconSet): string {
  return serialize(set)
}

export function setFromJSON(raw: string): IconSet | null {
  try {
    return parseSet(JSON.parse(raw))
  } catch {
    return null
  }
}

export function openSession(saved: IconSet | null): Session {
  return { document: saved ?? starterSet(), past: [], future: [] }
}

export function edit(session: Session, command: Command): EditResult {
  switch (command.kind) {
    case "select":
      return select(session, command.id)
    case "add":
      return add(session)
    case "rename":
      return rename(session, command.id, command.name)
    case "delete":
      return remove(session, command.id)
    case "weight":
      return setWeight(session, command.weight)
    case "snap":
      return setSnap(session, command.snap)
    case "cleanup":
      return setCleanup(session, command.cleanup)
    case "library":
      return setLibrary(session, command.library)
    case "commit":
      return commit(session, command.id, command.stroke)
    case "clear":
      return clear(session, command.id)
    case "undo":
      return undo(session)
    case "redo":
      return redo(session)
    default: {
      const never: never = command
      throw new Error(`Unknown command ${JSON.stringify(never)}`)
    }
  }
}

export function createSet(
  seeds: readonly (string | { readonly name: string; readonly concept: string })[],
  library: LibraryId = "lucide",
): IconSet {
  const icons: Icon[] = []
  const seen = new Set<string>()
  for (const seed of seeds) {
    const name = typeof seed === "string" ? seed : seed.name
    const concept = typeof seed === "string" ? seed : seed.concept
    if (!isIconName(name) || seen.has(name) || concept.length === 0) {
      throw new Error(`Icon name is not a unique slug: ${name}`)
    }
    seen.add(name)
    icons.push({ id: mintId(), name, concept, strokes: [] })
  }
  const list = nonEmpty(icons)
  if (!list) throw new Error("A set needs at least one icon")
  return {
    library,
    weight: 2,
    snap: false,
    cleanup: CLEANUP_OFF,
    selectedId: list[0].id,
    icons: list,
  }
}

function starterSet(): IconSet {
  const general = THEMES.find((theme) => theme.id === "general")
  if (!general) throw new Error("Missing general theme")
  return createSet(themeSlots(general.names, "lucide"), "lucide")
}

function select(session: Session, id: IconId): EditResult {
  if (session.document.selectedId === id) return same(session)
  if (!session.document.icons.some((icon) => icon.id === id)) {
    return reject(session, "missing-icon")
  }
  return {
    session: { ...session, document: { ...session.document, selectedId: id } },
    rejection: null,
  }
}

function add(session: Session): EditResult {
  const name = freeName(session.document.icons)
  const icon: Icon = { id: mintId(), name, concept: name, strokes: [] }
  const icons = nonEmpty([...session.document.icons, icon])
  if (!icons) return same(session)
  return remember(session, {
    ...session.document,
    icons,
    selectedId: icon.id,
  })
}

function rename(session: Session, id: IconId, name: string): EditResult {
  if (!isIconName(name)) return reject(session, "invalid-name")
  const icon = findIcon(session.document, id)
  if (!icon) return reject(session, "missing-icon")
  if (icon.name === name) return same(session)
  if (session.document.icons.some((item) => item.id !== id && item.name === name)) {
    return reject(session, "duplicate-name")
  }
  return remember(session, replaceIcon(session.document, id, { ...icon, name }))
}

function remove(session: Session, id: IconId): EditResult {
  if (session.document.icons.length === 1) return reject(session, "last-icon")
  const index = session.document.icons.findIndex((icon) => icon.id === id)
  if (index < 0) return reject(session, "missing-icon")
  const icons = nonEmpty(session.document.icons.filter((icon) => icon.id !== id))
  if (!icons) return reject(session, "last-icon")
  const selected =
    session.document.selectedId === id
      ? icons[Math.min(index, icons.length - 1)].id
      : session.document.selectedId
  return remember(session, { ...session.document, icons, selectedId: selected })
}

function setWeight(session: Session, weight: Weight): EditResult {
  if (session.document.weight === weight) return same(session)
  return remember(session, { ...session.document, weight })
}

function setSnap(session: Session, snap: boolean): EditResult {
  if (session.document.snap === snap) return same(session)
  return remember(session, { ...session.document, snap })
}

function setCleanup(session: Session, cleanup: Cleanup): EditResult {
  const current = session.document.cleanup
  if (current.straight === cleanup.straight && current.circle === cleanup.circle && current.close === cleanup.close) {
    return same(session)
  }
  return remember(session, { ...session.document, cleanup })
}

function setLibrary(session: Session, library: LibraryId): EditResult {
  if (session.document.library === library) return same(session)
  return remember(session, { ...session.document, library })
}

function commit(session: Session, id: IconId, stroke: Stroke): EditResult {
  const icon = findIcon(session.document, id)
  if (!icon) return reject(session, "missing-icon")
  const samples = cleanSamples(stroke.samples)
  if (!samples) return reject(session, "short-stroke")
  return remember(
    session,
    replaceIcon(session.document, id, {
      ...icon,
      strokes: [...icon.strokes, { samples }],
    }),
  )
}

function clear(session: Session, id: IconId): EditResult {
  const icon = findIcon(session.document, id)
  if (!icon) return reject(session, "missing-icon")
  if (icon.strokes.length === 0) return same(session)
  return remember(session, replaceIcon(session.document, id, { ...icon, strokes: [] }))
}

function undo(session: Session): EditResult {
  const previous = session.past[session.past.length - 1]
  if (!previous) return same(session)
  return {
    session: {
      document: previous,
      past: session.past.slice(0, -1),
      future: [session.document, ...session.future],
    },
    rejection: null,
  }
}

function redo(session: Session): EditResult {
  const next = session.future[0]
  if (!next) return same(session)
  return {
    session: {
      document: next,
      past: [...session.past, session.document].slice(-HISTORY_LIMIT),
      future: session.future.slice(1),
    },
    rejection: null,
  }
}

function remember(session: Session, document: IconSet): EditResult {
  return {
    session: {
      document,
      past: [...session.past, session.document].slice(-HISTORY_LIMIT),
      future: [],
    },
    rejection: null,
  }
}

function same(session: Session): EditResult {
  return { session, rejection: null }
}

function reject(session: Session, rejection: RejectReason): EditResult {
  return { session, rejection }
}

function findIcon(set: IconSet, id: IconId): Icon | undefined {
  return set.icons.find((icon) => icon.id === id)
}

function replaceIcon(set: IconSet, id: IconId, icon: Icon): IconSet {
  const icons = nonEmpty(set.icons.map((item) => (item.id === id ? icon : item)))
  if (!icons) return set
  return { ...set, icons }
}

function freeName(icons: readonly Icon[]): IconName {
  const taken = new Set<string>(icons.map((icon) => icon.name))
  const candidates = ["icon", ...Array.from({ length: 200 }, (_, index) => `icon-${index + 2}`)]
  for (const candidate of candidates) {
    if (!taken.has(candidate) && isIconName(candidate)) return candidate
  }
  throw new Error("No free icon name")
}

function cleanSamples(samples: readonly Sample[]): readonly Sample[] | null {
  if (samples.length === 0) return null
  const cleaned: Sample[] = []
  for (const sample of samples) {
    if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y) || !Number.isFinite(sample.pressure)) {
      return null
    }
    cleaned.push({
      x: sample.x,
      y: sample.y,
      pressure: clampPressure(sample.pressure),
    })
  }
  return cleaned
}

function clampPressure(pressure: number): number {
  if (pressure < 0) return 0
  if (pressure > 1) return 1
  return pressure
}

function mintId(): IconId {
  const id = crypto.randomUUID()
  if (isIconId(id)) return id
  throw new Error("Could not mint an icon id")
}

function nonEmpty(icons: readonly Icon[]): readonly [Icon, ...Icon[]] | null {
  const [first, ...rest] = icons
  if (!first) return null
  return [first, ...rest]
}

function serialize(set: IconSet): string {
  return JSON.stringify({
    version: 1,
    library: set.library,
    weight: set.weight,
    snap: set.snap,
    cleanup: set.cleanup,
    selectedId: set.selectedId,
    icons: set.icons.map((icon) => ({
      id: icon.id,
      name: icon.name,
      concept: icon.concept,
      strokes: icon.strokes.map((stroke) => ({
        samples: stroke.samples.map((sample) => ({
          x: sample.x,
          y: sample.y,
          pressure: sample.pressure,
        })),
      })),
    })),
  })
}

function parseSet(value: unknown): IconSet | null {
  if (!isRecord(value) || value.version !== 1 || !isWeight(value.weight) || typeof value.snap !== "boolean") {
    return null
  }
  if (typeof value.selectedId !== "string" || !isIconId(value.selectedId) || !Array.isArray(value.icons)) {
    return null
  }
  const icons: Icon[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const entry of value.icons) {
    const icon = parseIcon(entry)
    if (!icon || ids.has(icon.id) || names.has(icon.name)) return null
    ids.add(icon.id)
    names.add(icon.name)
    icons.push(icon)
  }
  const list = nonEmpty(icons)
  if (!list || !list.some((icon) => icon.id === value.selectedId)) return null
  return {
    library: isLibraryId(value.library) ? value.library : "lucide",
    weight: value.weight,
    snap: value.snap,
    cleanup: parseCleanup(value.cleanup),
    selectedId: value.selectedId,
    icons: list,
  }
}

function parseCleanup(value: unknown): Cleanup {
  if (!isRecord(value)) return CLEANUP_OFF
  return {
    straight: value.straight === true,
    circle: value.circle === true,
    close: value.close === true,
  }
}

function parseIcon(value: unknown): Icon | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null
  if (!isIconId(value.id) || !isIconName(value.name) || !Array.isArray(value.strokes)) return null
  const strokes: Stroke[] = []
  for (const entry of value.strokes) {
    const stroke = parseStroke(entry)
    if (!stroke) return null
    strokes.push(stroke)
  }
  const concept = typeof value.concept === "string" && value.concept.length > 0 ? value.concept : value.name
  return { id: value.id, name: value.name, concept, strokes }
}

function parseStroke(value: unknown): Stroke | null {
  if (!isRecord(value) || !Array.isArray(value.samples) || value.samples.length === 0) return null
  const samples: Sample[] = []
  for (const entry of value.samples) {
    if (!isRecord(entry) || typeof entry.x !== "number" || typeof entry.y !== "number") return null
    if (typeof entry.pressure !== "number") return null
    if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y) || !Number.isFinite(entry.pressure)) return null
    samples.push({ x: entry.x, y: entry.y, pressure: clampPressure(entry.pressure) })
  }
  return { samples }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
