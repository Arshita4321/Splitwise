import GroupCard from './GroupCard'

export default function GroupList({ groups }) {
  if (!groups?.length) {
    return (
      <div className="empty-state">
        <p>No groups yet. Create one to start splitting expenses.</p>
      </div>
    )
  }

  return (
    <div className="group-grid">
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} />
      ))}
    </div>
  )
}
