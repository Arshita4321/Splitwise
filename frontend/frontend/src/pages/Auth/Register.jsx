import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'

export default function Register() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <h2>Create account</h2>
      <p className="muted">Start splitting expenses in seconds.</p>
      <form onSubmit={submit} className="stack">
        <Input
          label="Full name"
          name="name"
          placeholder="Jane Doe"
          value={form.name}
          onChange={update}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={update}
          minLength={6}
          required
        />
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
