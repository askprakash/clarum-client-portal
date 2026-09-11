import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { auth, isAdminAccount, isPortalAccount, loginScopes } from './auth'
import { SignInPage } from './pages/SignInPage'
import { AppLayout } from './layout/AppLayout'
import { ClientsPage } from './pages/ClientsPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { ProfilePage } from './pages/ProfilePage'
import { StaffPage } from './pages/StaffPage'
import { UploadPage } from './pages/UploadPage'
import { portalService } from './services/portalService'
import type { AppView, ClientProfile } from './types'

const firmProfile: ClientProfile = {
  id: 'clarum-admin',
  fullName: 'CLARUM',
  title: 'Administrator',
  organization: 'CLARUM',
  email: 'Prakash@clarumcpa.com',
  phone: 'Not provided',
  mailingAddress: 'Not provided',
  clientSince: 'Not provided',
  engagements: [],
  preferredContact: 'Email',
}

function ClientWorkspace({
  client,
  isAdmin,
  view,
  mobileNavOpen,
  error,
  onNavigate,
  setMobileNavOpen,
  onSignOut,
}: {
  client: ClientProfile
  isAdmin: boolean
  view: AppView
  mobileNavOpen: boolean
  error: string
  onNavigate: (view: AppView) => void
  setMobileNavOpen: Dispatch<SetStateAction<boolean>>
  onSignOut: () => void
}) {
  return (
    <>
      <AppLayout
        currentView={view}
        client={client}
        isAdmin={isAdmin}
        clientOpen={isAdmin}
        mobileNavOpen={mobileNavOpen}
        onNavigate={onNavigate}
        onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
        onCloseMobileNav={() => setMobileNavOpen(false)}
        onSignOut={onSignOut}
      >
        {view === 'dashboard' && <DashboardPage onNavigate={onNavigate} />}
        {view === 'documents' && <DocumentsPage />}
        {view === 'upload' && <UploadPage />}
        {view === 'profile' && <ProfilePage />}
      </AppLayout>
      {error && <p role="alert">{error}</p>}
    </>
  )
}

function AdminPortal({
  error,
  onSignOut,
  setError,
}: {
  error: string
  onSignOut: () => void
  setError: (message: string) => void
}) {
  const [view, setView] = useState<AppView>('clients')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [actingId, setActingId] = useState(() => portalService.getActingClientId())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    portalService
      .listClients()
      .then((items) => {
        if (cancelled) return
        setClients(items)
        const stored = portalService.getActingClientId()
        if (stored && !items.some((client) => client.id === stored)) {
          portalService.setActingClient(null)
          setActingId(null)
        }
        setReady(true)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : 'Clients could not be loaded.')
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [setError])

  const selected = clients.find((client) => client.id === actingId) ?? null

  function handleNavigate(nextView: AppView) {
    if (nextView === 'clients' || nextView === 'staff') {
      portalService.setActingClient(null)
      setActingId(null)
    }
    setView(nextView)
    setMobileNavOpen(false)
  }

  if (!ready) {
    return (
      <AppLayout
        currentView="clients"
        client={firmProfile}
        isAdmin
        mobileNavOpen={false}
        onNavigate={handleNavigate}
        onToggleMobileNav={() => undefined}
        onCloseMobileNav={() => undefined}
        onSignOut={onSignOut}
      >
        <section className="page">
          <p className="lede">Loading clients…</p>
        </section>
      </AppLayout>
    )
  }

  if (!selected || view === 'clients' || view === 'staff') {
    return (
      <>
        <AppLayout
          currentView={view === 'staff' ? 'staff' : 'clients'}
          client={firmProfile}
          isAdmin
          mobileNavOpen={mobileNavOpen}
          onNavigate={handleNavigate}
          onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
          onCloseMobileNav={() => setMobileNavOpen(false)}
          onSignOut={onSignOut}
        >
          {view === 'staff' ? (
            <StaffPage />
          ) : (
            <ClientsPage
              onOpenClient={(client) => {
                setClients((current) => [...current.filter((item) => item.id !== client.id), client])
                portalService.setActingClient(client.id)
                setActingId(client.id)
                setView('dashboard')
              }}
            />
          )}
        </AppLayout>
        {error && <p role="alert">{error}</p>}
      </>
    )
  }

  return (
    <ClientWorkspace
      client={selected}
      isAdmin
      view={view}
      mobileNavOpen={mobileNavOpen}
      error={error}
      onNavigate={handleNavigate}
      setMobileNavOpen={setMobileNavOpen}
      onSignOut={onSignOut}
    />
  )
}

function App() {
  const [view, setView] = useState<AppView>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [error, setError] = useState('')
  const account = auth.getActiveAccount()

  if (!account || !isPortalAccount()) {
    return (
      <SignInPage
        title={account ? 'Account not assigned' : 'Please sign in'}
        message={
          account
            ? 'This account is not assigned to the CLARUM portal.'
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

  function handleSignOut() {
    setMobileNavOpen(false)
    void auth.logoutRedirect().catch(() => setError('Sign-out failed. Please try again.'))
  }

  if (isAdminAccount()) {
    return <AdminPortal error={error} onSignOut={handleSignOut} setError={setError} />
  }

  const client = portalService.getCurrentClient()

  function handleNavigate(nextView: AppView) {
    setView(nextView)
    setMobileNavOpen(false)
  }

  return (
    <ClientWorkspace
      client={client}
      isAdmin={false}
      view={view}
      mobileNavOpen={mobileNavOpen}
      error={error}
      onNavigate={handleNavigate}
      setMobileNavOpen={setMobileNavOpen}
      onSignOut={handleSignOut}
    />
  )
}

export default App
