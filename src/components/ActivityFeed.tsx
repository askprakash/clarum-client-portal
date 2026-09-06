import type { ActivityItem } from '../types'
import { formatDateTime } from '../utils/format'

const activityLabels: Record<ActivityItem['type'], string> = {
  upload: 'Delivered',
  review: 'Review',
  request: 'Request',
  notice: 'Notice',
}

type ActivityFeedProps = {
  items: ActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return <p className="empty-state">No recent activity.</p>
  }

  return (
    <ol className="activity-list">
      {items.map((item) => (
        <li key={item.id} className="activity-item">
          <span className="activity-item__label">{activityLabels[item.type]}</span>
          <div>
            <p className="activity-item__title">{item.title}</p>
            <p className="muted">{item.detail}</p>
            <time className="activity-item__time" dateTime={item.timestamp}>
              {formatDateTime(item.timestamp)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}
