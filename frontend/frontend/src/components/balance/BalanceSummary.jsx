import { formatMoney } from '../../utils/formatters'

/**
 * Renders the group balance breakdown returned by
 * GET /api/balances/group/:groupId
 *   { member_balances, pairwise, simplified_debts }
 */
export default function BalanceSummary({ data, currency, currentUserId, onSettle }) {
  if (!data) return null

  const { member_balances = [], simplified_debts = [] } = data

  return (
    <div className="balance-summary">
      <section className="panel">
        <h3 className="panel-title">Member balances</h3>
        <ul className="balance-list">
          {member_balances.map(({ user, net_balance }) => {
            const isYou = user.id === currentUserId
            const positive = net_balance > 0.01
            const negative = net_balance < -0.01
            return (
              <li key={user.id} className="balance-row">
                <span>{isYou ? 'You' : user.name}</span>
                <span
                  className={positive ? 'pos' : negative ? 'neg' : 'muted'}
                >
                  {positive && 'gets back '}
                  {negative && 'owes '}
                  {Math.abs(net_balance) < 0.01
                    ? 'settled up'
                    : formatMoney(Math.abs(net_balance), currency)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel">
        <h3 className="panel-title">Suggested settlements</h3>
        {simplified_debts.length === 0 ? (
          <p className="muted">Everyone is settled up 🎉</p>
        ) : (
          <ul className="settle-list">
            {simplified_debts.map((t, i) => {
              const youOwe = t.from.id === currentUserId
              return (
                <li key={i} className="settle-row">
                  <span>
                    <strong>{t.from.id === currentUserId ? 'You' : t.from.name}</strong> →{' '}
                    <strong>{t.to.id === currentUserId ? 'You' : t.to.name}</strong>
                  </span>
                  <span className="settle-right">
                    <span className="settle-amount">{formatMoney(t.amount, currency)}</span>
                    {youOwe ? (
                      <button
                        className="link-btn"
                        onClick={() => onSettle?.({ paid_to: t.to.id, amount: t.amount })}
                      >
                        Settle
                      </button>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
