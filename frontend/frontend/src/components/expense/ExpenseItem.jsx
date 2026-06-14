import { formatMoney, formatDate } from '../../utils/formatters'
import { capitalize } from '../../utils/helpers'

export default function ExpenseItem({ expense, currency, currentUserId, onOpenChat }) {
  const youPaid = expense.paid_by === currentUserId

  return (
    <div className="expense-item">
      <div className="expense-date">
        <span className="expense-day">{formatDate(expense.created_at)}</span>
      </div>

      <div className="expense-main">
        <div className="expense-icon" aria-hidden="true">
          {capitalize(expense.category || 'general').charAt(0)}
        </div>
        <div>
          <p className="expense-desc">{expense.description}</p>
          <p className="expense-sub">
            {youPaid ? 'You' : expense.paid_by_name} paid {formatMoney(expense.amount, currency)}
            {' · '}
            {capitalize(expense.split_type)}
          </p>
        </div>
      </div>

      <div className="expense-actions">
        <span className="expense-amount">{formatMoney(expense.amount, currency)}</span>
        <button className="link-btn" onClick={() => onOpenChat?.(expense)}>
          Comments
          {Number(expense.message_count) > 0 ? ` (${expense.message_count})` : ''}
        </button>
      </div>
    </div>
  )
}
