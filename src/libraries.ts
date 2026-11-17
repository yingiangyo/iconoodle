export const LIBRARY_IDS = ["lucide", "heroicons", "phosphor", "tabler", "material"] as const

export type LibraryId = (typeof LIBRARY_IDS)[number]

export type LibraryInfo = {
  readonly id: LibraryId
  readonly label: string
  readonly short: string
  readonly license: string
  readonly holder: string
  readonly url: string
  readonly licenseUrl: string
}

export const LIBRARIES: readonly LibraryInfo[] = [
  {
    id: "lucide",
    label: "Lucide",
    short: "Lucide",
    license: "ISC",
    holder: "Lucide Contributors",
    url: "https://lucide.dev",
    licenseUrl: "https://github.com/lucide-icons/lucide/blob/main/LICENSE",
  },
  {
    id: "heroicons",
    label: "Heroicons",
    short: "Heroicons",
    license: "MIT",
    holder: "Tailwind Labs",
    url: "https://heroicons.com",
    licenseUrl: "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE",
  },
  {
    id: "phosphor",
    label: "Phosphor",
    short: "Phosphor",
    license: "MIT",
    holder: "Phosphor Icons",
    url: "https://phosphoricons.com",
    licenseUrl: "https://github.com/phosphor-icons/core/blob/main/LICENSE",
  },
  {
    id: "tabler",
    label: "Tabler",
    short: "Tabler",
    license: "MIT",
    holder: "Paweł Kuna",
    url: "https://tabler.io/icons",
    licenseUrl: "https://github.com/tabler/tabler-icons/blob/main/LICENSE",
  },
  {
    id: "material",
    label: "Material Symbols",
    short: "Material",
    license: "Apache 2.0",
    holder: "Google",
    url: "https://fonts.google.com/icons",
    licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0",
  },
]

export function isLibraryId(value: unknown): value is LibraryId {
  return LIBRARY_IDS.some((id) => id === value)
}

export function libraryInfo(id: LibraryId): LibraryInfo {
  const found = LIBRARIES.find((library) => library.id === id)
  if (!found) throw new Error(`Unknown library ${id}`)
  return found
}

export const GUIDE_CHOICES = [...LIBRARY_IDS, "off"] as const

export type GuideChoice = (typeof GUIDE_CHOICES)[number]

export function choiceLabel(choice: GuideChoice, form: "label" | "short" = "label"): string {
  return choice === "off" ? "Off" : libraryInfo(choice)[form]
}

export function cycleChoice(current: GuideChoice, delta: number): GuideChoice {
  const index = GUIDE_CHOICES.indexOf(current)
  const next = (index < 0 ? 0 : index) + delta
  const wrapped = ((next % GUIDE_CHOICES.length) + GUIDE_CHOICES.length) % GUIDE_CHOICES.length
  return GUIDE_CHOICES[wrapped] ?? "off"
}
