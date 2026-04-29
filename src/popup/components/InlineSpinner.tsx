type InlineSpinnerProps = {
  className?: string
  size?: 'sm' | 'md'
}

export function InlineSpinner({ className = '', size = 'sm' }: InlineSpinnerProps) {
  return <span className={`spykit-inline-spinner spykit-inline-spinner--${size} ${className}`.trim()} aria-hidden="true" />
}
