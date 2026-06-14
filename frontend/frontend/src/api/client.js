import axios from 'axios'
import { TOKEN_KEY } from '../utils/constants'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * Pre-configured axios instance.
 * - baseURL points at the Express API (`/api/...`)
 * - JWT from localStorage is attached to every request
 * - responses are unwrapped to `res.data` (the ApiResponse envelope)
 * - 401s clear the session and bounce to /login
 */
const client = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const status = error.response?.status
    const message =
      error.response?.data?.message || error.message || 'Something went wrong'

    if (status === 401 && !location.pathname.startsWith('/login')) {
      localStorage.removeItem(TOKEN_KEY)
      // soft redirect so AuthContext can re-evaluate
      if (location.pathname !== '/login') location.href = '/login'
    }

    return Promise.reject(new Error(message))
  }
)

export { API_URL }
export default client
