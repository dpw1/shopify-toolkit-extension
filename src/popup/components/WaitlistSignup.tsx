import { useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'

// TODO: Replace with your actual Shopify Storefront store URL and public token
const SHOPIFY_STORE_URL = 'https://xwh1tv-pp.myshopify.com/api/2024-01/graphql.json'
const SHOPIFY_STOREFRONT_TOKEN = 'YOUR_PUBLIC_TOKEN'

/** Domains that are obviously fake/placeholder emails. */
const FAKE_EMAIL_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net',
  'yourdomain.com', 'yourdomain.org',
  'domain.com', 'test.com', 'test.org', 'test.net',
  'placeholder.com', 'youremail.com', 'email.com',
  'sample.com', 'fake.com', 'acme.com',
  'company.com', 'website.com', 'mail.com',
  'noemail.com', 'nomail.com',
])

function isLikelyFakeEmail(email: string): boolean {
  const lower = email.toLowerCase().trim()
  const atIdx = lower.indexOf('@')
  if (atIdx < 1) return false
  const domain = lower.slice(atIdx + 1)
  return FAKE_EMAIL_DOMAINS.has(domain)
}

async function addToWaitlist(
  email: string,
  tag: string,
): Promise<{ ok: boolean; error?: string }> {
  if (SHOPIFY_STOREFRONT_TOKEN === 'YOUR_PUBLIC_TOKEN') {
    console.log('[SpyKit] Waitlist signup (placeholder):', email, tag)
    return { ok: true }
  }

  try {
    const resp = await fetch(SHOPIFY_STORE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({
        query: `
          mutation {
            customerCreate(input: {
              email: "${email.replace(/"/g, '')}",
              acceptsMarketing: true,
              tags: ["${tag}"]
            }) {
              customer { id email }
              customerUserErrors { message }
            }
          }
        `,
      }),
    })
    const data = (await resp.json()) as {
      data?: { customerCreate?: { customerUserErrors?: { message: string }[] } }
    }
    const errors = data?.data?.customerCreate?.customerUserErrors ?? []
    if (errors.length > 0) return { ok: false, error: errors[0].message }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Network error — please try again.' }
  }
}

interface WaitlistSignupProps {
  /** Identifies which feature this signup is for (used as the Shopify customer tag). */
  feature: 'compare' | 'export'
  icon: ReactNode
  title: string
  /** Short badge text, e.g. "Coming soon". */
  tagline: string
  /** Longer description shown above the divider. */
  description: string
  /** Optional context line, e.g. peer-store count info for Compare. */
  contextLine?: string
}

/**
 * Shared "Coming soon + waitlist" panel used by both the Compare and Export tabs.
 * Fixed minimum height ensures the popup doesn't change size when navigating between tabs.
 */
export function WaitlistSignup({
  feature,
  icon,
  title,
  tagline,
  description,
  contextLine,
}: WaitlistSignupProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    if (isLikelyFakeEmail(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }

    setError(null)
    setBusy(true)
    try {
      const result = await addToWaitlist(trimmed, `waitlist-spykit-${feature}`)
      if (result.ok) {
        setSubmitted(true)
      } else {
        setError(result.error ?? 'Something went wrong — please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="compare-page card">
      <div className="compare-page__header">
        <div className="compare-page__icon" aria-hidden>
          {icon}
        </div>
        <div>
          <h3 className="compare-page__title">{title}</h3>
          <span className="compare-page__badge">{tagline}</span>
        </div>
      </div>

      {contextLine && (
        <p className="compare-page__context">{contextLine}</p>
      )}

      <p className="compare-page__muted">{description}</p>

      <div className="compare-page__divider" />

      {submitted ? (
        <div className="waitlist-success" role="status">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} aria-hidden />
          <span>You're on the list! We'll email you when <strong>{title}</strong> launches.</span>
        </div>
      ) : (
        <form className="compare-page__form" onSubmit={(e) => void onSubmit(e)}>
          <p className="compare-page__form-intro">
            Be the first to know when this feature goes live. Join the early-access waitlist.
          </p>
          <div className="waitlist-input-row">
            <input
              type="email"
              name="email"
              autoComplete="email"
              className="compare-page__input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              disabled={busy}
              required
            />
            <button
              type="submit"
              className="btn btn-primary compare-page__submit waitlist-submit-btn"
              disabled={busy || !email.trim()}
            >
              {busy ? 'Joining…' : 'Join waitlist'}
            </button>
          </div>
          {error && (
            <p className="waitlist-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
