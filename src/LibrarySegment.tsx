import { useEffect, useRef } from "react"
import { choiceLabel, type GuideChoice } from "./libraries.ts"

type LibrarySegmentProps<Choice extends GuideChoice> = {
  choices: readonly Choice[]
  value: Choice
  onChoose: (choice: Choice) => void
}

export function LibrarySegment<Choice extends GuideChoice>({ choices, value, onChoose }: LibrarySegmentProps<Choice>) {
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const row = rowRef.current
    const pressed = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (row && pressed && pressed.offsetLeft + pressed.offsetWidth > row.clientWidth) {
      row.scrollLeft = pressed.offsetLeft - 8
    }
  }, [])
  return (
    <div ref={rowRef} className="segment library-row" role="group" aria-label="Tracing library">
      {choices.map((choice) => (
        <button key={choice} type="button" aria-pressed={value === choice} onClick={() => onChoose(choice)}>
          {choiceLabel(choice)}
        </button>
      ))}
    </div>
  )
}
