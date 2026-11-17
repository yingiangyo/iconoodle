export const SMOOTH_KEY = "iconoodle:smooth"

export const SMOOTH_LEVELS = [0, 1, 2, 3] as const

export type SmoothLevel = (typeof SMOOTH_LEVELS)[number]

export const SMOOTH_DEFAULT: SmoothLevel = 2

export const SMOOTH_LABELS = ["Off", "Low", "Med", "High"] as const

export function isSmoothLevel(value: unknown): value is SmoothLevel {
  return value === 0 || value === 1 || value === 2 || value === 3
}

export function readSmooth(storage: Pick<Storage, "getItem">): SmoothLevel {
  const raw = storage.getItem(SMOOTH_KEY)
  if (raw === null) return SMOOTH_DEFAULT
  const level = Number(raw)
  return isSmoothLevel(level) ? level : SMOOTH_DEFAULT
}
