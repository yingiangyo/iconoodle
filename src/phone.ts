import { useEffect, useState } from "react"

export const PHONE_QUERY = "(max-width: 960px), (max-height: 520px)"

export function usePhone(): boolean {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return phone
}
