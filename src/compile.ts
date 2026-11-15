import simplify from "simplify-js"
import { tidyOutline, tidyPoints, type Pt, type Tidy } from "./cleanup.ts"
import {
  ARTBOARD,
  CLEANUP_OFF,
  type Cleanup,
  type IconId,
  type IconSet,
  type Sample,
  type Stroke,
  type Weight,
} from "./document.ts"

export type LineCap = "butt" | "round" | "square"
export type LineJoin = "miter" | "round" | "bevel"

export type Mark = {
  readonly d: string
  readonly units: typeof ARTBOARD
  readonly viewBox: `0 0 ${typeof ARTBOARD} ${typeof ARTBOARD}`
  readonly strokeWidth: Weight
  readonly lineCap: LineCap
  readonly lineJoin: LineJoin
  readonly fill: "none"
  readonly stroke: "currentColor"
}

export type Paint = {
  readonly weight?: Weight
  readonly lineCap?: LineCap
  readonly lineJoin?: LineJoin
}

const simplifyTolerance = 0.35

export function compileIcon(set: IconSet, iconId: IconId, live: Stroke | null, paint?: Paint): Mark {
  const icon = set.icons.find((item) => item.id === iconId)
  const parts: string[] = []
  if (icon) {
    for (const stroke of icon.strokes) {
      const path = strokeToPath(stroke, set.snap, set.cleanup)
      if (path) parts.push(path)
    }
  }
  if (live && live.samples.length > 0) {
    const path = strokeToPath(live, set.snap, CLEANUP_OFF)
    if (path) parts.push(path)
  }
  return {
    d: parts.join(" "),
    units: ARTBOARD,
    viewBox: "0 0 24 24",
    strokeWidth: paint?.weight ?? set.weight,
    lineCap: paint?.lineCap ?? "round",
    lineJoin: paint?.lineJoin ?? "round",
    fill: "none",
    stroke: "currentColor",
  }
}

export function drawnPoints(set: IconSet, iconId: IconId): Pt[] {
  const icon = set.icons.find((item) => item.id === iconId)
  if (!icon) return []
  const points: Pt[] = []
  for (const stroke of icon.strokes) {
    const prepared = prepare(stroke, set.snap)
    if (prepared.length === 0) continue
    points.push(...tidyOutline(tidyPoints(prepared, set.cleanup)))
  }
  return points
}

function strokeToPath(stroke: Stroke, snap: boolean, cleanup: Cleanup): string {
  const points = prepare(stroke, snap)
  if (points.length === 0) return ""
  if (points.length === 1) return dot(points[0])
  return pathFor(tidyPoints(points, cleanup))
}

function prepare(stroke: Stroke, snap: boolean): Pt[] {
  return simplifyPoints(dedupe(stroke.samples.map((sample) => place(sample, snap))))
}

function pathFor(tidy: Tidy): string {
  if (tidy.kind === "arc") return arcPath(tidy)
  if (tidy.points.length === 0) return ""
  if (tidy.points.length === 1) return dot(tidy.points[0])
  const [first, ...rest] = tidy.points
  let path = `M${num(first.x)} ${num(first.y)}`
  for (const point of rest) path += `L${num(point.x)} ${num(point.y)}`
  if (tidy.closed) path += "Z"
  return path
}

function arcPath(tidy: Extract<Tidy, { kind: "arc" }>): string {
  const r = num(tidy.r)
  const start = `M${num(tidy.start.x)} ${num(tidy.start.y)}`
  if (tidy.full) {
    const mid = { x: tidy.cx - (tidy.start.x - tidy.cx), y: tidy.cy - (tidy.start.y - tidy.cy) }
    return `${start}A${r} ${r} 0 1 ${tidy.sweep} ${num(mid.x)} ${num(mid.y)}A${r} ${r} 0 1 ${tidy.sweep} ${num(tidy.start.x)} ${num(tidy.start.y)}Z`
  }
  return `${start}A${r} ${r} 0 ${tidy.large} ${tidy.sweep} ${num(tidy.end.x)} ${num(tidy.end.y)}`
}

function dot(point: Pt): string {
  return `M${num(point.x)} ${num(point.y)}L${num(point.x)} ${num(point.y)}`
}

function place(sample: Sample, snap: boolean): Pt {
  return { x: clamp(snap ? Math.round(sample.x) : sample.x), y: clamp(snap ? Math.round(sample.y) : sample.y) }
}

function clamp(value: number): number {
  if (value < 0) return 0
  if (value > ARTBOARD) return ARTBOARD
  return value
}

function dedupe(points: readonly Pt[]): Pt[] {
  const kept: Pt[] = []
  for (const point of points) {
    const previous = kept[kept.length - 1]
    if (previous && previous.x === point.x && previous.y === point.y) continue
    kept.push(point)
  }
  return kept
}

function simplifyPoints(points: Pt[]): Pt[] {
  if (points.length <= 2) return points
  return simplify(points, simplifyTolerance, true)
}

function num(value: number): string {
  return String(Math.round(value * 100) / 100)
}
