import simplify from "simplify-js"
import { ARTBOARD, type IconId, type IconSet, type Sample, type Stroke, type Weight } from "./document.ts"

export type Mark = {
  readonly d: string
  readonly units: typeof ARTBOARD
  readonly viewBox: `0 0 ${typeof ARTBOARD} ${typeof ARTBOARD}`
  readonly strokeWidth: Weight
  readonly lineCap: "round"
  readonly lineJoin: "round"
  readonly fill: "none"
  readonly stroke: "currentColor"
}

const simplifyTolerance = 0.35

export function compileIcon(set: IconSet, iconId: IconId, live: Stroke | null): Mark {
  const icon = set.icons.find((item) => item.id === iconId)
  const strokes = icon ? withLive(icon.strokes, live) : []
  const parts: string[] = []
  for (const stroke of strokes) {
    const path = strokeToPath(stroke, set.snap)
    if (path) parts.push(path)
  }
  return {
    d: parts.join(" "),
    units: ARTBOARD,
    viewBox: "0 0 24 24",
    strokeWidth: set.weight,
    lineCap: "round",
    lineJoin: "round",
    fill: "none",
    stroke: "currentColor",
  }
}

function withLive(strokes: readonly Stroke[], live: Stroke | null): readonly Stroke[] {
  if (!live || live.samples.length === 0) return strokes
  return [...strokes, live]
}

function strokeToPath(stroke: Stroke, snap: boolean): string {
  const points = simplifyPoints(dedupe(stroke.samples.map((sample) => place(sample, snap))))
  if (points.length === 0) return ""
  if (points.length === 1) {
    const [point] = points
    return `M${num(point.x)} ${num(point.y)}L${num(point.x)} ${num(point.y)}`
  }
  const [first, ...rest] = points
  let path = `M${num(first.x)} ${num(first.y)}`
  for (const point of rest) path += `L${num(point.x)} ${num(point.y)}`
  return path
}

function place(sample: Sample, snap: boolean): { x: number; y: number } {
  const x = clamp(snap ? Math.round(sample.x) : sample.x)
  const y = clamp(snap ? Math.round(sample.y) : sample.y)
  return { x, y }
}

function clamp(value: number): number {
  if (value < 0) return 0
  if (value > ARTBOARD) return ARTBOARD
  return value
}

function dedupe(points: readonly { x: number; y: number }[]): { x: number; y: number }[] {
  const kept: { x: number; y: number }[] = []
  for (const point of points) {
    const previous = kept[kept.length - 1]
    if (previous && previous.x === point.x && previous.y === point.y) continue
    kept.push(point)
  }
  return kept
}

function simplifyPoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 2) return points
  return simplify(points, simplifyTolerance, true)
}

function num(value: number): string {
  return String(Math.round(value * 100) / 100)
}
