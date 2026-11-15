import type { Mark } from "./compile.ts"

const LIST = ["Daily review", "Travel fund", "Shared album"]
const TABS = ["Home", "Search", "Alerts", "You"]

export function Mockup({ marks }: { marks: readonly Mark[] }) {
  const drawn = marks.filter((mark) => mark.d.length > 0)
  const pool = drawn.length > 0 ? drawn : marks
  const at = (index: number) => pool[index % Math.max(pool.length, 1)]
  return (
    <section className="mockups" aria-label="In context">
      <div className="preview-head">
        <h2>In context</h2>
        <span>Tab bar, navigation, a button, and a list</span>
      </div>
      <div className="phones">
        <Phone tone="light" at={at} />
        <Phone tone="dark" at={at} />
      </div>
    </section>
  )
}

function Phone({ tone, at }: { tone: "light" | "dark"; at: (index: number) => Mark | undefined }) {
  return (
    <div className={`phone ${tone}`}>
      <div className="phone-nav">
        <Glyph mark={at(0)} size={18} />
        <strong>Northwind</strong>
        <Glyph mark={at(1)} size={18} />
      </div>
      <ul className="phone-list">
        {LIST.map((label, index) => (
          <li key={label}>
            <Glyph mark={at(index + 2)} size={20} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="phone-button">
        <Glyph mark={at(5)} size={16} />
        Save changes
      </button>
      <div className="phone-tabs">
        {TABS.map((label, index) => (
          <div key={label} className={index === 0 ? "is-current" : undefined}>
            <Glyph mark={at(index)} size={20} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Glyph({ mark, size }: { mark: Mark | undefined; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      {mark?.d ? (
        <path d={mark.d} strokeWidth={mark.strokeWidth} strokeLinecap={mark.lineCap} strokeLinejoin={mark.lineJoin} />
      ) : null}
    </svg>
  )
}
