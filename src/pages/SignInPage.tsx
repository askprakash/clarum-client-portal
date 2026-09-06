import { Logo } from '../components/Logo'

type SignInPageProps = {
  title: string
  message: string
  actionLabel: string
  error: string
  onAction: () => void
}

function MicrosoftMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

export function SignInPage({ title, message, actionLabel, error, onAction }: SignInPageProps) {
  return (
    <main className="auth-screen">
      <section className="auth-screen__visual">
        <figure className="auth-screen__hero">
          <img
            src="/clarum-login-hero.jpg"
            alt="Welcome to CLARUMCPA client portal"
          />
          <figcaption className="auth-screen__assurance">
            <MicrosoftMark size={18} />
            Secured by Microsoft Enterprise-Grade Security
          </figcaption>
        </figure>
      </section>
      <section className="auth-screen__panel">
        <article className="auth-card">
          <div className="auth-card__brand">
            <Logo />
          </div>
          <div className="auth-card__body">
            <h1>{title}</h1>
            <p>{message}</p>
            {error && (
              <p className="auth-card__error" role="alert">
                {error}
              </p>
            )}
            <div className="auth-card__actions">
              <button type="button" className="btn btn--signin" onClick={onAction}>
                {actionLabel}
              </button>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}
