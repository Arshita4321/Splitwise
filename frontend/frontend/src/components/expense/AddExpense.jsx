import { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Button from '../common/Button'
import { createExpense } from '../../api/expenses'
import { SPLIT_TYPES, CATEGORIES } from '../../utils/constants'
import { useToast } from '../../hooks/useToast'

const emptySplit = (members) =>
  members.reduce((acc, m) => ({ ...acc, [m.id]: '' }), {})

export default function AddExpense({ open, onClose, group, members, currentUserId, onCreated }) {
  const toast = useToast()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('general')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitType, setSplitType] = useState('equal')
  const [splitValues, setSplitValues] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPaidBy(currentUserId)
      setSplitValues(emptySplit(members))
    }
  }, [open, currentUserId, members])

  const total = parseFloat(amount) || 0

  // Live helper text showing how the current input sums up.
  const summary = useMemo(() => {
    if (splitType === 'equal') return null
    const vals = Object.values(splitValues).map((v) => parseFloat(v) || 0)
    const sum = vals.reduce((a, b) => a + b, 0)
    if (splitType === 'unequal')
      return `Allocated ${sum.toFixed(2)} of ${total.toFixed(2)}`
    if (splitType === 'percentage') return `Total ${sum.toFixed(2)}% (must equal 100%)`
    if (splitType === 'shares') return `Total ${sum} shares`
    return null
  }, [splitType, splitValues, total])

  const buildSplits = () => {
    const entries = Object.entries(splitValues)
      .map(([uid, val]) => [Number(uid), parseFloat(val)])
      .filter(([, val]) => !Number.isNaN(val) && val > 0)

    if (splitType === 'unequal')
      return entries.map(([user_id, amount]) => ({ user_id, amount }))
    if (splitType === 'percentage')
      return entries.map(([user_id, percentage]) => ({ user_id, percentage }))
    if (splitType === 'shares')
      return entries.map(([user_id, shares]) => ({ user_id, shares: parseInt(shares, 10) }))
    return []
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!description.trim() || !total) {
      toast.error('Please enter a description and amount')
      return
    }

    const payload = {
      group_id: group.id,
      paid_by: Number(paidBy),
      amount: total,
      description: description.trim(),
      category,
      split_type: splitType,
    }
    if (splitType !== 'equal') {
      const splits = buildSplits()
      if (splits.length < 2) {
        toast.error('Add values for at least two members')
        return
      }
      payload.splits = splits
    }

    setSaving(true)
    try {
      const expense = await createExpense(payload)
      toast.success('Expense added')
      setDescription('')
      setAmount('')
      setSplitType('equal')
      onCreated?.(expense)
      onClose?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add an expense">
      <form onSubmit={submit} className="stack">
        <Input
          label="Description"
          name="description"
          placeholder="e.g. Dinner, Cab, Groceries"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoFocus
        />

        <div className="row">
          <Input
            label={`Amount (${group.currency})`}
            name="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Category"
            as="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))}
          />
        </div>

        <div className="row">
          <Input
            label="Paid by"
            as="select"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            options={members.map((m) => ({
              value: m.id,
              label: m.id === currentUserId ? 'You' : m.name,
            }))}
          />
          <Input
            label="Split"
            as="select"
            value={splitType}
            onChange={(e) => setSplitType(e.target.value)}
            options={SPLIT_TYPES}
          />
        </div>

        {splitType === 'equal' ? (
          <p className="hint">Split equally between all {members.length} members.</p>
        ) : (
          <div className="split-editor">
            {members.map((m) => (
              <div className="split-row" key={m.id}>
                <span className="split-name">{m.id === currentUserId ? 'You' : m.name}</span>
                <input
                  className="field-control split-input"
                  type="number"
                  min="0"
                  step={splitType === 'shares' ? '1' : '0.01'}
                  placeholder={
                    splitType === 'percentage' ? '%' : splitType === 'shares' ? 'shares' : '0.00'
                  }
                  value={splitValues[m.id] ?? ''}
                  onChange={(e) =>
                    setSplitValues((s) => ({ ...s, [m.id]: e.target.value }))
                  }
                />
              </div>
            ))}
            {summary ? <p className="hint">{summary}</p> : null}
          </div>
        )}

        <Button type="submit" loading={saving}>
          Save expense
        </Button>
      </form>
    </Modal>
  )
}
