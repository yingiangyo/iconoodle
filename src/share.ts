import LZString from "lz-string"
import { setFromJSON, setToJSON, type IconSet } from "./document.ts"

export function shareHash(set: IconSet): string {
  return `s=${LZString.compressToEncodedURIComponent(setToJSON(set))}`
}

export function setFromHash(hash: string): IconSet | null {
  const body = hash.startsWith("#") ? hash.slice(1) : hash
  if (!body.startsWith("s=")) return null
  const json = LZString.decompressFromEncodedURIComponent(body.slice(2))
  if (!json) return null
  return setFromJSON(json)
}
