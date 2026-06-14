import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Loader from '../../components/common/Loader'
import Button from '../../components/common/Button'
import CreateGroup from '../../components/group/CreateGroup'
import GroupList from '../../components/group/GroupList'
import { getMyGroups, getMyInvites, respondInvite } from '../../api/groups'
import { getMyBalances } from '../../api/balances'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { formatMoney } from '../../utils/formatters'

export default function Dashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [invites, setInvites] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    try {
      const [g, inv, bal] = await Promise.all([
        getMyGroups(),
        getMyInvites(),
        getMyBalances(),
      ])
      setGroups(g)
      setInvites(inv)
      setSummary(bal)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const respond = async (inviteId, action) => {
    try {
      await respondInvite(inviteId, action)
      toast.success(action === 'accept' ? 'Joined group' : 'Invite declined')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return <Loader full />

  const net = summary?.overall_net ?? 0

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Hi, {user.name.split(' ')[0]} 👋</h1>
          <p className="muted">Here&apos;s your overview.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New group</Button>
      </header>

      <section className="stat-row">
        <div className="stat-card">
          <span className="stat-label">Total balance</span>
          <span className={`stat-value ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}`}>
            {net > 0 && 'You are owed '}
            {net < 0 && 'You owe '}
            {Math.abs(net) < 0.01 ? 'All settled' : formatMoney(Math.abs(net))}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Groups</span>
          <span className="stat-value">{groups.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending invites</span>
          <span className="stat-value">{invites.length}</span>
        </div>
      </section>

      {invites.length > 0 ? (
        <section className="panel">
          <h3 className="panel-title">Group invites</h3>
          <ul className="invite-list">
            {invites.map((inv) => (
              <li key={inv.id} className="invite-row">
                <span>
                  <strong>{inv.invited_by_name}</strong> invited you to{' '}
                  <strong>{inv.group_name}</strong>
                </span>
                <span className="invite-actions">
                  <Button size="sm" onClick={() => respond(inv.id, 'accept')}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => respond(inv.id, 'decline')}>
                    Decline
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="section-head">
          <h2>Your groups</h2>
        </div>
        <GroupList groups={groups} />
      </section>

      {summary?.groups?.length ? (
        <section className="panel">
          <h3 className="panel-title">Balances by group</h3>
          <ul className="balance-list">
            {summary.groups.map((row) => (
              <li
                key={row.group.id}
                className="balance-row clickable"
                onClick={() => navigate(`/groups/${row.group.id}`)}
              >
                <span>{row.group.name}</span>
                <span className={row.net > 0 ? 'pos' : row.net < 0 ? 'neg' : 'muted'}>
                  {row.net > 0 && 'you are owed '}
                  {row.net < 0 && 'you owe '}
                  {formatMoney(Math.abs(row.net), row.group.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CreateGroup
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(g) => navigate(`/groups/${g.id}`)}
      />
    </div>
  )
}
