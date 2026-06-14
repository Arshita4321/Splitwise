import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Loader from '../../components/common/Loader'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ExpenseList from '../../components/expense/ExpenseList'
import AddExpense from '../../components/expense/AddExpense'
import BalanceSummary from '../../components/balance/BalanceSummary'
import ChatBox from '../../components/chat/ChatBox'
import { getGroup, deleteGroup, inviteUser, removeMember } from '../../api/groups'
import { getGroupExpenses } from '../../api/expenses'
import { getGroupBalances, recordPayment } from '../../api/balances'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { initials, colorFromString } from '../../utils/helpers'

const TABS = ['Expenses', 'Balances', 'Members']

export default function GroupDetails() {
  const { id } = useParams()
  const groupId = Number(id)
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Expenses')

  const [showAdd, setShowAdd] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [chatExpense, setChatExpense] = useState(null)

  const isAdmin = group?.role === 'admin'

  const loadGroup = useCallback(async () => {
    const g = await getGroup(groupId)
    setGroup(g)
    return g
  }, [groupId])

  const loadExpenses = useCallback(async () => {
    setExpenses(await getGroupExpenses(groupId))
  }, [groupId])

  const loadBalances = useCallback(async () => {
    setBalances(await getGroupBalances(groupId))
  }, [groupId])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        await Promise.all([loadGroup(), loadExpenses(), loadBalances()])
      } catch (err) {
        toast.error(err.message)
        navigate('/groups', { replace: true })
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const refreshAll = async () => {
    await Promise.all([loadExpenses(), loadBalances(), loadGroup()])
  }

  const onInvite = async (e) => {
    e.preventDefault()
    try {
      await inviteUser(groupId, inviteEmail.trim())
      toast.success('Invite sent')
      setInviteEmail('')
      setShowInvite(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const onSettle = async ({ paid_to, amount }) => {
    try {
      await recordPayment({ group_id: groupId, paid_to, amount })
      toast.success('Payment recorded')
      refreshAll()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const onRemoveMember = async (userId) => {
    try {
      await removeMember(groupId, userId)
      toast.success('Member removed')
      loadGroup()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const onDeleteGroup = async () => {
    if (!confirm('Delete this group and all its expenses? This cannot be undone.')) return
    try {
      await deleteGroup(groupId)
      toast.success('Group deleted')
      navigate('/groups', { replace: true })
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading || !group) return <Loader full />

  const members = group.members || []

  return (
    <div className="page">
      <nav className="breadcrumb">
        <Link to="/groups">Groups</Link> <span>/</span> <span>{group.name}</span>
      </nav>

      <header className="page-header">
        <div className="group-head">
          <div
            className="group-avatar lg"
            style={{ background: colorFromString(group.name) }}
            aria-hidden="true"
          >
            {initials(group.name)}
          </div>
          <div>
            <h1>{group.name}</h1>
            <p className="muted">
              {members.length} members · {group.currency}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <Button variant="ghost" onClick={() => setShowInvite(true)}>
            Invite
          </Button>
          <Button onClick={() => setShowAdd(true)}>Add expense</Button>
        </div>
      </header>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="group-body">
        <div className="group-main">
          {tab === 'Expenses' && (
            <ExpenseList
              expenses={expenses}
              currency={group.currency}
              currentUserId={user.id}
              onOpenChat={setChatExpense}
            />
          )}

          {tab === 'Balances' && (
            <BalanceSummary
              data={balances}
              currency={group.currency}
              currentUserId={user.id}
              onSettle={onSettle}
            />
          )}

          {tab === 'Members' && (
            <div className="panel">
              <ul className="member-list">
                {members.map((m) => (
                  <li key={m.id} className="member-row">
                    <div className="member-info">
                      <div
                        className="user-avatar sm"
                        style={{ background: colorFromString(m.name) }}
                        aria-hidden="true"
                      >
                        {initials(m.name)}
                      </div>
                      <div>
                        <span className="user-name">
                          {m.id === user.id ? 'You' : m.name}
                        </span>
                        <span className="muted member-email">{m.email}</span>
                      </div>
                    </div>
                    <span className="member-right">
                      <span className={`role-pill ${m.role}`}>{m.role}</span>
                      {isAdmin && m.id !== user.id ? (
                        <button className="link-btn" onClick={() => onRemoveMember(m.id)}>
                          Remove
                        </button>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              {isAdmin ? (
                <div className="danger-zone">
                  <Button variant="danger" onClick={onDeleteGroup}>
                    Delete group
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {chatExpense ? (
          <aside className="group-aside">
            <button className="link-btn close-chat" onClick={() => setChatExpense(null)}>
              ✕ Close
            </button>
            <ChatBox expense={chatExpense} />
          </aside>
        ) : null}
      </div>

      <AddExpense
        open={showAdd}
        onClose={() => setShowAdd(false)}
        group={group}
        members={members}
        currentUserId={user.id}
        onCreated={refreshAll}
      />

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite a member">
        <form onSubmit={onInvite} className="stack">
          <Input
            label="Email address"
            type="email"
            placeholder="friend@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <p className="hint">They must already have a SplitWise account.</p>
          <Button type="submit">Send invite</Button>
        </form>
      </Modal>
    </div>
  )
}
