import { useState } from 'react'
import { auth, isClientAccount, loginScopes } from './auth'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { ProfilePage } from './pages/ProfilePage'
import { UploadPage } from './pages/UploadPage'
import { portalService } from './services/portalService'
import type { AppView } from './types'

function App() {
  const [view, setView] = useState<AppView>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [error, setError] = useState('')
  const account = auth.getActiveAccount()
  if (!account || !isClientAccount()) {
    return <main className="page"><article className="card card--narrow">
      <p className="eyebrow">CLARUM Client Portal</p>
      <h1>{account ? 'Account not assigned' : 'Welcome to CLARUM'}</h1>
      <p>{account ? 'This account is not assigned to the PRC Analytics portal.' : 'Sign in with your client email and password.'}</p>
      {error && <p role="alert">{error}</p>}
      <button className="btn btn--primary" onClick={() => {
        const action = account ? auth.logoutRedirect() : auth.loginRedirect({ scopes: loginScopes, prompt: 'login' })
        void action.catch(() => setError('Sign-in could not start. Please try again.'))
      }}>{account ? 'Sign out' : 'Sign in'}</button>
    </article></main>
  }
  const client = portalService.getCurrentClient()

  function handleNavigate(nextView: AppView) {
    setView(nextView)
    setMobileNavOpen(false)
  }

  return (
    <>
      <AppLayout
        currentView={view}
        client={client}
        mobileNavOpen={mobileNavOpen}
        onNavigate={handleNavigate}
        onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
        onCloseMobileNav={() => setMobileNavOpen(false)}
        onSignOut={() => {
          setMobileNavOpen(false)
          void auth.logoutRedirect().catch(() => setError('Sign-out failed. Please try again.'))
        }}
      >
        {view === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
        {view === 'documents' && <DocumentsPage />}
        {view === 'upload' && <UploadPage />}
        {view === 'profile' && <ProfilePage />}
      </AppLayout>

      {error && <p role="alert">{error}</p>}
    </>
  )
}

export default App
