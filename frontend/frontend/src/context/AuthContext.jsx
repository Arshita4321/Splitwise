import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as authApi from '../api/auth'
import { TOKEN_KEY, USER_KEY } from '../utils/constants'
import { disconnectSocket } from '../socket/chat.socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  // Validate the stored token on first load.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .getMe()
      .then(({ user }) => {
        setUser(user)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const persist = (user, token) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setUser(user)
  }

  const login = useCallback(async (credentials) => {
    const { user, token } = await authApi.login(credentials)
    persist(user, token)
    return user
  }, [])

  const register = useCallback(async (payload) => {
    const { user, token } = await authApi.register(payload)
    persist(user, token)
    return user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    disconnectSocket()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
