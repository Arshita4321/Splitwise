import { Link } from 'react-router-dom'
import { initials, colorFromString } from '../../utils/helpers'

export default function GroupCard({ group }) {
  return (
    <Link to={`/groups/${group.id}`} className="group-card">
      <div
        className="group-avatar"
        style={{ background: colorFromString(group.name) }}
        aria-hidden="true"
      >
        {initials(group.name)}
      </div>
      <div className="group-card-body">
        <h3 className="group-card-title">{group.name}</h3>
        <p className="group-card-meta">
          {group.member_count} {Number(group.member_count) === 1 ? 'member' : 'members'}
          {group.role === 'admin' ? ' · admin' : ''}
        </p>
      </div>
      <span className="group-card-currency">{group.currency}</span>
    </Link>
  )
}
