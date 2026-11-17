export function buzz(milliseconds: number) {
  if (typeof navigator.vibrate === "function") navigator.vibrate(milliseconds)
}

export type Handoff = "shared" | "dismissed" | "unavailable"

export async function shareNatively(data: ShareData): Promise<Handoff> {
  if (!window.matchMedia("(pointer: coarse)").matches || !navigator.canShare?.(data)) return "unavailable"
  try {
    await navigator.share(data)
    return "shared"
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError" ? "dismissed" : "unavailable"
  }
}
