import { portalService } from '../services/portalService'

export function ProfilePage() {
  const client = portalService.getCurrentClient()

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Profile</h1>
          <p className="lede">
            Contact details used by your CLARUM team. Profile updates will be
            available after Microsoft Entra External ID is connected.
          </p>
        </div>
      </div>

      <article className="card card--narrow">
        <div className="profile-head">
          <div className="avatar" aria-hidden="true">
            {client.fullName
              .split(' ')
              .map((part) => part[0])
              .join('')}
          </div>
          <div>
            <h2>{client.fullName}</h2>
            <p className="muted">
              {client.title}, {client.organization}
            </p>
          </div>
        </div>

        <dl className="detail-list">
          <div>
            <dt>Email</dt>
            <dd>{client.email}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{client.phone}</dd>
          </div>
          <div>
            <dt>Preferred contact</dt>
            <dd>{client.preferredContact}</dd>
          </div>
          <div>
            <dt>Mailing address</dt>
            <dd className="pre-line">{client.mailingAddress}</dd>
          </div>
          <div>
            <dt>Client since</dt>
            <dd>{client.clientSince}</dd>
          </div>
          <div>
            <dt>Engagements</dt>
            <dd>{client.engagements.join(' · ')}</dd>
          </div>
        </dl>
      </article>
    </section>
  )
}
