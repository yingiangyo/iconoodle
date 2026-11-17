import simplify from "simplify-js"
import { tidyOutline, tidyPoints, type Joins, type Pt, type Tidy } from "./cleanup.ts"
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
import { SMOOTH_DEFAULT, type SmoothLevel } from "./smooth.ts"

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

type Hand = {
  readonly snap: boolean
  readonly smoothing: number
  readonly tolerance: number
  readonly joins: Joins
}

const FREEHAND: Record<SmoothLevel, Hand> = {
  0: { snap: false, smoothing: 0, tolerance: 0, joins: "corner" },
  1: { snap: false, smoothing: 0.3, tolerance: 0.1, joins: "curve" },
  2: { snap: false, smoothing: 0.6, tolerance: 0.2, joins: "curve" },
  3: { snap: false, smoothing: 1.4, tolerance: 0.25, joins: "curve" },
}
const SNAPPED: Hand = { snap: true, smoothing: 0, tolerance: 0.35, joins: "corner" }
const CORNER_TURN = Math.PI / 3
// A smooth arc simplified at tolerance t turns by at most about 8t / length at each kept point.
const CORNER_BEND_PER_TOLERANCE = 12

export function compileIcon(set: IconSet, iconId: IconId, paint?: Paint): Mark {
  const icon = set.icons.find((item) => item.id === iconId)
  const parts: string[] = []
  if (icon) {
    for (const stroke of icon.strokes) {
      const path = strokeToPath(stroke, set.snap, set.cleanup)
      if (path) parts.push(path)
    }
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

export function livePath(stroke: Stroke, snap: boolean): string {
  return strokeToPath(stroke, snap, CLEANUP_OFF)
}

export function drawnPoints(set: IconSet, iconId: IconId): Pt[] {
  const icon = set.icons.find((item) => item.id === iconId)
  if (!icon) return []
  const points: Pt[] = []
  for (const stroke of icon.strokes) {
    const hand = handFor(stroke, set.snap)
    const prepared = prepare(stroke, hand)
    if (prepared.length === 0) continue
    points.push(...tidyOutline(tidyPoints(prepared, set.cleanup, hand.joins)))
  }
  return points
}

function strokeToPath(stroke: Stroke, snap: boolean, cleanup: Cleanup): string {
  const hand = handFor(stroke, snap)
  const points = prepare(stroke, hand)
  if (points.length === 0) return ""
  if (points.length === 1) return dot(points[0])
  return pathFor(tidyPoints(points, cleanup, hand.joins), hand)
}

function handFor(stroke: Stroke, snap: boolean): Hand {
  return snap ? SNAPPED : FREEHAND[stroke.smooth ?? SMOOTH_DEFAULT]
}

function prepare(stroke: Stroke, hand: Hand): Pt[] {
  const placed = dedupe(stroke.samples.map((sample) => place(sample, hand.snap)))
  return simplifyPoints(smooth(placed, hand.smoothing), hand.tolerance)
}

function pathFor(tidy: Tidy, hand: Hand): string {
  if (tidy.kind === "arc") return arcPath(tidy)
  if (tidy.points.length === 0) return ""
  if (tidy.points.length === 1) return dot(tidy.points[0])
  if (tidy.joins === "curve") return curvePath(tidy.points, tidy.closed, CORNER_BEND_PER_TOLERANCE * hand.tolerance)
  const [first, ...rest] = tidy.points
  let path = `M${num(first.x)} ${num(first.y)}`
  for (const point of rest) path += `L${num(point.x)} ${num(point.y)}`
  if (tidy.closed) path += "Z"
  return path
}

// Each handle runs along the neighbour chord and is a third of its own segment, so a long
// straight run keeps its direction and the bend happens in the short segments around it.
function curvePath(points: readonly Pt[], closed: boolean, cornerBend: number): string {
  const count = points.length
  const tangents = points.map((_, index) => tangentAt(points, index, closed, cornerBend))
  const [first] = points
  let path = `M${num(first.x)} ${num(first.y)}`
  const segments = closed ? count : count - 1
  for (let index = 0; index < segments; index += 1) {
    const from = points[index]
    const to = points[(index + 1) % count]
    const leaving = tangents[index]
    const arriving = tangents[(index + 1) % count]
    if (!leaving && !arriving) {
      path += `L${num(to.x)} ${num(to.y)}`
      continue
    }
    const chord = direction(from, to)
    const reach = Math.hypot(to.x - from.x, to.y - from.y) / 3
    const out = leaving ?? chord
    const into = arriving ?? chord
    path += `C${num(from.x + out.x * reach)} ${num(from.y + out.y * reach)} ${num(to.x - into.x * reach)} ${num(to.y - into.y * reach)} ${num(to.x)} ${num(to.y)}`
  }
  if (closed) path += "Z"
  return path
}

function tangentAt(points: readonly Pt[], index: number, closed: boolean, cornerBend: number): Pt | null {
  const count = points.length
  if (!closed && (index === 0 || index === count - 1)) return null
  const before = points[(index - 1 + count) % count]
  const here = points[index]
  const after = points[(index + 1) % count]
  const inX = here.x - before.x
  const inY = here.y - before.y
  const outX = after.x - here.x
  const outY = after.y - here.y
  const turn = Math.abs(Math.atan2(inX * outY - inY * outX, inX * outX + inY * outY))
  const shorter = Math.min(Math.hypot(inX, inY), Math.hypot(outX, outY))
  if (turn > CORNER_TURN || turn * shorter > cornerBend) return null
  return direction(before, after)
}

function direction(from: Pt, to: Pt): Pt {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (length === 0) return { x: 0, y: 0 }
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
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

function smooth(points: Pt[], radius: number): Pt[] {
  if (radius === 0 || points.length <= 2) return points
  const along = [0]
  for (let index = 1; index < points.length; index += 1) {
    const step = Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
    along.push(along[index - 1] + step)
  }
  const total = along[along.length - 1]
  let start = 0
  return points.map((point, index) => {
    const reach = Math.min(radius, along[index], total - along[index])
    if (reach <= 0) return point
    while (along[index] - along[start] >= reach) start += 1
    let x = 0
    let y = 0
    let weight = 0
    for (let other = start; other < points.length && along[other] - along[index] < reach; other += 1) {
      const share = 1 - Math.abs(along[other] - along[index]) / reach
      x += points[other].x * share
      y += points[other].y * share
      weight += share
    }
    return { x: x / weight, y: y / weight }
  })
}

function simplifyPoints(points: Pt[], tolerance: number): Pt[] {
  if (tolerance === 0 || points.length <= 2) return points
  return simplify(points, tolerance, true)
}

function num(value: number): string {
  return String(Math.round(value * 100) / 100)
}
