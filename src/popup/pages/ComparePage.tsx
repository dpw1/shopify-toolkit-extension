import { useState, type FormEvent } from 'react'
import { GitCompareArrows } from 'lucide-react'

export interface ComparePageProps {
  themeName: string
  themeStoreCount: number
  totalDatasetCount: number
}

export default function ComparePage({
  themeName,
  themeStoreCount,
  totalDatasetCount,
}: ComparePageProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    console.log('[SpyKit Compare] notify email (placeholder):', trimmed)
    setSubmitted(true)
  }

  const contextLine =
    themeStoreCount > 0 && totalDatasetCount > 0
      ? `See how this store compares to ${themeStoreCount.toLocaleString()} others using ${themeName}.`
      : `See how this store compares to others using ${themeName}.`

  return (
    <div className="compare-page card">
      <div className="compare-page__header">
        <GitCompareArrows
          size={28}
          strokeWidth={2}
          className="compare-page__icon"
          aria-hidden
        />
        <div>
          <h3 className="compare-page__title">Compare</h3>
          <p className="compare-page__badge">Coming soon</p>
        </div>
      </div>

      <p className="compare-page__context">{contextLine}</p>

      <p className="compare-page__muted compare-page__soon">Coming in 2 weeks</p>

      <div className="compare-page__divider" />

      {submitted ? (
        <p className="compare-page__success" role="status">
          You are on the list. We will email you when Compare launches.
        </p>
      ) : (
        <form className="compare-page__form" onSubmit={onSubmit}>
          <p className="compare-page__form-intro">
            Get notified when you can run theme comparisons, spot app-stack gaps, and benchmark stores
            against the SpyKit dataset.
          </p>
          <label className="compare-page__label" htmlFor="compare-notify-email">
            Email
          </label>
          <input
            id="compare-notify-email"
            type="email"
            name="email"
            autoComplete="email"
            className="compare-page__input"
            placeholder="you@store.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-primary compare-page__submit">
            Notify me
          </button>
        </form>
      )}
    </div>
  )
}
