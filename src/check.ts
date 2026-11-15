import { drawnPoints } from "./compile.ts"
import { ARTBOARD, type IconId, type IconSet } from "./document.ts"

export type Drift =
  | { readonly kind: "size"; readonly larger: boolean }
  | { readonly kind: "padding"; readonly tight: boolean }
  | { readonly kind: "weight"; readonly heavy: boolean }

export function checkSet(set: IconSet): ReadonlyMap<IconId, readonly Drift[]> {
  const measured = set.icons.flatMap((icon) => {
    const points = drawnPoints(set, icon.id)
    if (points.length === 0) return []
    return [measure(icon.id, points)]
  })
  const flags = new Map<IconId, readonly Drift[]>()
  if (measured.length < 2) return flags
  const size = median(measured.map((item) => item.size))
  const pad = median(measured.map((item) => item.pad))
  const weight = median(measured.map((item) => item.weight))
  for (const item of measured) {
    const drifts: Drift[] = []
    if (item.size > size * 1.35 && item.size - size > 2.5) drifts.push({ kind: "size", larger: true })
    if (item.size < size * 0.7 && size - item.size > 2.5) drifts.push({ kind: "size", larger: false })
    if (item.pad < pad - 1.6) drifts.push({ kind: "padding", tight: true })
    if (item.pad > pad + 1.6) drifts.push({ kind: "padding", tight: false })
    if (item.weight > weight * 1.6 && item.weight - weight > 0.8) drifts.push({ kind: "weight", heavy: true })
    if (item.weight < weight * 0.55 && weight - item.weight > 0.8) drifts.push({ kind: "weight", heavy: false })
    if (drifts.length > 0) flags.set(item.id, drifts)
  }
  return flags
}

export function driftLabel(drift: Drift): string {
  if (drift.kind === "size") return drift.larger ? "Larger than the set" : "Smaller than the set"
  if (drift.kind === "padding") return drift.tight ? "Breaks the keyline" : "Too much padding"
  return drift.heavy ? "Heavier than the set" : "Lighter than the set"
}

function measure(id: IconId, points: readonly { x: number; y: number }[]) {
  let minX = ARTBOARD
  let minY = ARTBOARD
  let maxX = 0
  let maxY = 0
  let pad = ARTBOARD
  let length = 0
  points.forEach((point, index) => {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
    pad = Math.min(pad, point.x, point.y, ARTBOARD - point.x, ARTBOARD - point.y)
    if (index > 0) length += Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y)
  })
  const size = Math.max(maxX - minX, maxY - minY, 0.01)
  return { id, size, pad, weight: length / size }
}
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}
