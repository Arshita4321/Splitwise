import { useState } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Button from '../common/Button'
import { createGroup } from '../../api/groups'
import { CURRENCIES } from '../../utils/constants'
import { useToast } from '../../hooks/useToast'

export default function CreateGroup({ open, onClose, onCreated }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const group = await createGroup({ name: name.trim(), currency })
      toast.success('Group created')
      setName('')
      onCreated?.(group)
      onClose?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a group">
      <form onSubmit={submit} className="stack">
        <Input
          label="Group name"
          name="name"
          placeholder="e.g. Goa Trip, Flatmates"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Input
          label="Currency"
          as="select"
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          options={CURRENCIES}
        />
        <Button type="submit" loading={saving}>
          Create group
        </Button>
      </form>
    </Modal>
  )
}
