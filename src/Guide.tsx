import { Suspense, type ComponentType, type LazyExoticComponent } from "react"
import type { LibraryId } from "./libraries.ts"

type Icon = ComponentType<{
  size?: number | string
  strokeWidth?: number | string
  "aria-hidden"?: boolean
}>

type GlyphMap = Record<string, LazyExoticComponent<Icon>>

const loaders: Record<LibraryId, () => Promise<{ glyphs: GlyphMap }>> = {
  lucide: () => import("./packs/lucide.tsx"),
  heroicons: () => import("./packs/hero.tsx"),
  phosphor: () => import("./packs/phosphor.tsx"),
  tabler: () => import("./packs/tabler.tsx"),
  material: () => import("./packs/material.tsx"),
}

const packs = new Map<LibraryId, GlyphMap>()
const pending = new Map<LibraryId, Promise<GlyphMap>>()

function readPack(library: LibraryId): GlyphMap {
  const ready = packs.get(library)
  if (ready) return ready
  let request = pending.get(library)
  if (!request) {
    request = loaders[library]().then((mod) => {
      packs.set(library, mod.glyphs)
      return mod.glyphs
    })
    pending.set(library, request)
  }
  throw request
}

export function Guide({ library, concept }: { library: LibraryId; concept: string }) {
  const glyphs = readPack(library)
  const Icon = glyphs[concept]
  if (!Icon) return null
  return (
    <Suspense fallback={null}>
      <Icon size="100%" strokeWidth={1.5} aria-hidden />
    </Suspense>
  )
}
