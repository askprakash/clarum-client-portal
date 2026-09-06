import { useState } from 'react'
import { auth, isClientAccount, loginScopes } from './auth'
import { SignInPage } from './pages/SignInPage'
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
    return (
      <SignInPage
        title={account ? 'Account not assigned' : 'Please sign in'}
        message={
          account
            ? 'This account is not assigned to the PRC Analytics portal.'
            : 'to access your secure client portal'
        }
        actionLabel={account ? 'Sign out' : 'Sign in'}
        error={error}
        onAction={() => {
          const action = account
            ? auth.logoutRedirect()
            : auth.loginRedirect({ scopes: loginScopes, prompt: 'login' })
          void action.catch(() => setError('Sign-in could not start. Please try again.'))
        }}
      />
    )
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
