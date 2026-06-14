import ExpenseItem from './ExpenseItem'

export default function ExpenseList({ expenses, currency, currentUserId, onOpenChat }) {
  if (!expenses?.length) {
    return (
      <div className="empty-state">
        <p>No expenses yet. Add the first one to get started.</p>
      </div>
    )
  }

  return (
    <div className="expense-list">
      {expenses.map((e) => (
        <ExpenseItem
          key={e.id}
          expense={e}
          currency={currency}
          currentUserId={currentUserId}
          onOpenChat={onOpenChat}
        />
      ))}
    </div>
  )
}
