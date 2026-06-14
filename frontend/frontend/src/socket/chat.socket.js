import { io } from 'socket.io-client'
import { API_URL } from '../api/client'
import { TOKEN_KEY } from '../utils/constants'

/**
 * Singleton Socket.IO connection for the per-expense chat.
 * The backend authenticates via the JWT passed in `auth.token`.
 *
 * Server -> client events:
 *   joined, new_message, message_deleted, user_typing, user_stop_typing, error
 * Client -> server events:
 *   join_expense, send_message, delete_message, typing, stop_typing, leave_expense
 */
let socket = null

export function getSocket() {
  if (socket && socket.connected) return socket

  const token = localStorage.getItem(TOKEN_KEY)
  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
