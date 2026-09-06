type LogoProps = {
  compact?: boolean
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className={compact ? 'brand brand--compact' : 'brand'}>
      <img
        className="brand__logo"
        src="/clarum-logo.jpg"
        alt="CLARUM"
        width={1024}
        height={434}
      />
    </div>
  )
}
