type LogoProps = {
  compact?: boolean
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className={compact ? 'brand brand--compact' : 'brand'}>
      <svg
        className="brand__mark"
        viewBox="0 0 36 36"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="1" y="1" width="34" height="34" rx="2" className="brand__frame" />
        <path
          className="brand__letter"
          d="M25.2 11.4c-1.1-1.5-2.9-2.4-5.1-2.4-4.3 0-7.3 3.1-7.3 8.9s3 8.9 7.3 8.9c2.2 0 4-0.9 5.1-2.4l-1.7-1.3c-0.8 1.1-2 1.7-3.4 1.7-2.8 0-4.6-2.2-4.6-6.9s1.8-6.9 4.6-6.9c1.4 0 2.6 0.6 3.4 1.7l1.7-1.3z"
        />
      </svg>
      <div className="brand__text">
        <span className="brand__name">CLARUM</span>
        {!compact && <span className="brand__subtitle">Client Portal</span>}
      </div>
    </div>
  )
}
