import type { Cleanup } from "./document.ts"

export type Pt = { readonly x: number; readonly y: number }

export type Joins = "curve" | "corner"

export type Tidy =
  | { readonly kind: "poly"; readonly points: readonly Pt[]; readonly closed: boolean; readonly joins: Joins }
  | {
      readonly kind: "arc"
      readonly cx: number
      readonly cy: number
      readonly r: number
      readonly start: Pt
      readonly end: Pt
      readonly large: 0 | 1
      readonly sweep: 0 | 1
      readonly full: boolean
    }

const STRAIGHT_TOLERANCE = 0.6
const CIRCLE_ERROR = 0.7
const CLOSE_GAP = 1.4

export function tidyPoints(points: readonly Pt[], cleanup: Cleanup, joins: Joins): Tidy {
  if (points.length <= 1 || (!cleanup.straight && !cleanup.circle && !cleanup.close)) {
    return { kind: "poly", points, closed: false, joins }
  }
  if (cleanup.circle && points.length >= 6) {
    const arc = fitArc(points)
    if (arc) return arc
  }
  const straightened = cleanup.straight ? straighten(points) : points
  const closed = cleanup.close && shouldClose(straightened)
  return { kind: "poly", points: straightened, closed, joins: cleanup.straight ? "corner" : joins }
}

export function tidyOutline(tidy: Tidy): Pt[] {
  if (tidy.kind === "poly") return tidy.closed ? [...tidy.points, tidy.points[0]] : [...tidy.points]
  const steps = tidy.full ? 16 : 8
  const start = Math.atan2(tidy.start.y - tidy.cy, tidy.start.x - tidy.cx)
  const end = tidy.full
    ? start + (tidy.sweep === 1 ? Math.PI * 2 : -Math.PI * 2)
    : Math.atan2(tidy.end.y - tidy.cy, tidy.end.x - tidy.cx)
  let sweep = end - start
  if (!tidy.full) {
    if (tidy.sweep === 1 && sweep < 0) sweep += Math.PI * 2
    if (tidy.sweep === 0 && sweep > 0) sweep -= Math.PI * 2
  }
  const points: Pt[] = []
  for (let index = 0; index <= steps; index += 1) {
    const angle = start + (sweep * index) / steps
    points.push({ x: tidy.cx + tidy.r * Math.cos(angle), y: tidy.cy + tidy.r * Math.sin(angle) })
  }
  return points
}

function straighten(points: readonly Pt[]): Pt[] {
  if (points.length <= 2) return [...points]
  const kept: Pt[] = [points[0]]
  let index = 0
  while (index < points.length - 1) {
    let next = index + 1
    for (let end = index + 2; end < points.length; end += 1) {
      if (segmentLength(points[index], points[end]) < 1.2) continue
      if (maxDeviation(points, index, end) <= STRAIGHT_TOLERANCE) next = end
    }
    kept.push(points[next])
    index = next
  }
  return kept
}

function shouldClose(points: readonly Pt[]): boolean {
  if (points.length < 4) return false
  const gap = distance(points[0], points[points.length - 1])
  if (gap > CLOSE_GAP) return false
  let length = 0
  for (let index = 1; index < points.length; index += 1) length += distance(points[index - 1], points[index])
  return length > 8 && gap < length * 0.2
}

function fitArc(points: readonly Pt[]): Tidy | null {
  const fit = fitCircle(points)
  if (!fit || fit.r < 1.4 || fit.r > 11.5 || fit.error > CIRCLE_ERROR) return null
  const span = signedSpan(points, fit.cx, fit.cy)
  const gap = distance(points[0], points[points.length - 1])
  const full = Math.abs(span) > 5.2 && gap < Math.max(1.5, fit.r * 0.28)
  if (!full && Math.abs(span) < 0.9) return null
  const sweep: 0 | 1 = span >= 0 ? 1 : 0
  const large: 0 | 1 = Math.abs(span) > Math.PI ? 1 : 0
  return {
    kind: "arc",
    cx: fit.cx,
    cy: fit.cy,
    r: fit.r,
    start: points[0],
    end: points[points.length - 1],
    large,
    sweep,
    full,
  }
}

function fitCircle(points: readonly Pt[]): { cx: number; cy: number; r: number; error: number } | null {
  let sx = 0
  let sy = 0
  let sxx = 0
  let syy = 0
  let sxy = 0
  let sxz = 0
  let syz = 0
  let sz = 0
  for (const point of points) {
    const z = point.x * point.x + point.y * point.y
    sx += point.x
    sy += point.y
    sxx += point.x * point.x
    syy += point.y * point.y
    sxy += point.x * point.y
    sxz += point.x * z
    syz += point.y * z
    sz += z
  }
  const solved = solve3([sxx, sxy, sx, sxz], [sxy, syy, sy, syz], [sx, sy, points.length, sz])
  if (!solved) return null
  const [a, b, c] = solved
  const cx = a / 2
  const cy = b / 2
  const radiusSquared = c + cx * cx + cy * cy
  if (!(radiusSquared > 0)) return null
  const r = Math.sqrt(radiusSquared)
  let error = 0
  for (const point of points) error = Math.max(error, Math.abs(Math.hypot(point.x - cx, point.y - cy) - r))
  return { cx, cy, r, error }
}

function signedSpan(points: readonly Pt[], cx: number, cy: number): number {
  let previous = Math.atan2(points[0].y - cy, points[0].x - cx)
  let span = 0
  for (let index = 1; index < points.length; index += 1) {
    const angle = Math.atan2(points[index].y - cy, points[index].x - cx)
    let delta = angle - previous
    if (delta > Math.PI) delta -= Math.PI * 2
    if (delta < -Math.PI) delta += Math.PI * 2
    span += delta
    previous = angle
  }
  return span
}

function maxDeviation(points: readonly Pt[], start: number, end: number): number {
  const a = points[start]
  const b = points[end]
  const length = distance(a, b)
  if (length === 0) return 0
  let max = 0
  for (let index = start + 1; index < end; index += 1) {
    const point = points[index]
    const area = Math.abs((b.x - a.x) * (a.y - point.y) - (a.x - point.x) * (b.y - a.y))
    max = Math.max(max, area / length)
  }
  return max
}

function segmentLength(a: Pt, b: Pt): number {
  return distance(a, b)
}

function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function solve3(row1: number[], row2: number[], row3: number[]): [number, number, number] | null {
  const rows = [row1.slice(), row2.slice(), row3.slice()]
  for (let column = 0; column < 3; column += 1) {
    let pivot = column
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row
    }
    if (Math.abs(rows[pivot][column]) < 1e-8) return null
    if (pivot !== column) {
      const swap = rows[column]
      rows[column] = rows[pivot]
      rows[pivot] = swap
    }
    const divisor = rows[column][column]
    for (let index = column; index < 4; index += 1) rows[column][index] /= divisor
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue
      const factor = rows[row][column]
      for (let index = column; index < 4; index += 1) rows[row][index] -= factor * rows[column][index]
    }
  }
  return [rows[0][3], rows[1][3], rows[2][3]]
}
