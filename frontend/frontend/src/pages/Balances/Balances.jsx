import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Loader from '../../components/common/Loader'
import { getMyBalances } from '../../api/balances'
import { useToast } from '../../hooks/useToast'
import { formatMoney } from '../../utils/formatters'

export default function Balances() {
  const toast = useToast()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyBalances()
      .then(setSummary)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <Loader full />

  const net = summary?.overall_net ?? 0
  const groups = summary?.groups ?? []

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Balances</h1>
          <p className="muted">Your overall position across every group.</p>
        </div>
      </header>

      <section className="stat-row">
        <div className="stat-card wide">
          <span className="stat-label">Overall</span>
          <span className={`stat-value ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}`}>
            {net > 0 && 'You are owed '}
            {net < 0 && 'You owe '}
            {Math.abs(net) < 0.01 ? 'All settled up' : formatMoney(Math.abs(net))}
          </span>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">By group</h3>
        {groups.length === 0 ? (
          <p className="muted">You&apos;re all settled up across every group 🎉</p>
        ) : (
          <ul className="balance-list">
            {groups.map((row) => (
              <li
                key={row.group.id}
                className="balance-row clickable"
                onClick={() => navigate(`/groups/${row.group.id}`)}
              >
                <span>{row.group.name}</span>
                <span className="balance-detail">
                  <span className="muted small">
                    owe {formatMoney(row.you_owe, row.group.currency)} · owed{' '}
                    {formatMoney(row.you_are_owed, row.group.currency)}
                  </span>
                  <span className={row.net > 0 ? 'pos' : row.net < 0 ? 'neg' : 'muted'}>
                    {formatMoney(Math.abs(row.net), row.group.currency)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
