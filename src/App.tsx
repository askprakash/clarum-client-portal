import { useState } from 'react'
import { Modal } from './components/Modal'
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
  const [signOutOpen, setSignOutOpen] = useState(false)
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
          setSignOutOpen(true)
        }}
      >
        {view === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
        {view === 'documents' && <DocumentsPage />}
        {view === 'upload' && <UploadPage />}
        {view === 'profile' && <ProfilePage />}
      </AppLayout>

      {signOutOpen && (
        <Modal title="Sign out" onClose={() => setSignOutOpen(false)}>
          <p>
            Sign-in is not connected yet. Microsoft Entra External ID will handle
            authentication in a later phase.
          </p>
          <div className="modal__footer">
            <button type="button" className="btn btn--primary" onClick={() => setSignOutOpen(false)}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

export default App
