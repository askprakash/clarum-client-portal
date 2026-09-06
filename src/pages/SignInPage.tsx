import { Logo } from '../components/Logo'

type SignInPageProps = {
  title: string
  message: string
  actionLabel: string
  error: string
  onAction: () => void
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning!'
  if (hour < 17) return 'Good Afternoon!'
  return 'Good Evening!'
}

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

export function SignInPage({ title, message, actionLabel, error, onAction }: SignInPageProps) {
  const isSignIn = actionLabel === 'Sign in'

  return (
    <main className="auth-screen">
      <div className="auth-screen__scene" aria-hidden="true">
        <div className="auth-screen__rays" />
        <div className="auth-screen__vault" />
      </div>
      <div className="auth-screen__copy">
        <p className="auth-screen__hello">{greeting()}</p>
        <h1>Welcome to CLARUMCPA client portal</h1>
      </div>
      <article className="auth-card">
        <div className="auth-card__brand">
          <Logo />
        </div>
        <div className="auth-card__body">
          <h2>{title}</h2>
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
          {isSignIn && (
            <>
              <div className="auth-card__divider">
                <span>or sign in with</span>
              </div>
              <button type="button" className="btn btn--microsoft" onClick={onAction}>
                <MicrosoftMark />
                Microsoft
              </button>
            </>
          )}
          <p className="auth-card__help">
            <a href="https://clarumcpa.com" target="_blank" rel="noreferrer">
              Need help getting started?
            </a>
          </p>
        </div>
      </article>
    </main>
  )
}
