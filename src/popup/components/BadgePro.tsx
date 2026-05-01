import { Star } from 'lucide-react'

/**
 * Reusable Pro badge — identical to the one in the header.
 * Use wherever a Pro feature needs to be labelled.
 */
export function BadgePro() {
  return (
    <span className="badge-pro">
      <Star style={{ width: 12, height: 12 }} strokeWidth={2} aria-hidden />
      Pro
    </span>
  )
}
