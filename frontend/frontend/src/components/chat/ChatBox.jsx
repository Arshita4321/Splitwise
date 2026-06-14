import { useEffect, useRef, useState } from 'react'
import MessageItem from './MessageItem'
import Loader from '../common/Loader'
import { getSocket } from '../../socket/chat.socket'
import { useAuth } from '../../context/AuthContext'

/**
 * Real-time chat for a single expense, backed by Socket.IO.
 * Mirrors the backend `chat.socket.js` event contract.
 */
export default function ChatBox({ expense }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connecting, setConnecting] = useState(true)
  const [typingUser, setTypingUser] = useState(null)
  const listRef = useRef(null)
  const typingTimeout = useRef(null)

  const expenseId = expense?.id

  useEffect(() => {
    if (!expenseId) return
    const socket = getSocket()
    setConnecting(true)

    const onJoined = (data) => {
      if (data.expense_id === expenseId) {
        setMessages(data.messages || [])
        setConnecting(false)
      }
    }
    const onNew = (msg) => {
      if (msg.expense_id === expenseId) setMessages((m) => [...m, msg])
    }
    const onDeleted = ({ message_id }) =>
      setMessages((m) => m.filter((x) => x.id !== message_id))
    const onTyping = ({ name }) => setTypingUser(name)
    const onStopTyping = () => setTypingUser(null)
    const onError = (err) => {
      console.error('[chat] socket error:', err)
      setConnecting(false)
    }

    socket.on('joined', onJoined)
    socket.on('new_message', onNew)
    socket.on('message_deleted', onDeleted)
    socket.on('user_typing', onTyping)
    socket.on('user_stop_typing', onStopTyping)
    socket.on('error', onError)

    socket.emit('join_expense', { expense_id: expenseId })

    return () => {
      socket.emit('leave_expense', { expense_id: expenseId })
      socket.off('joined', onJoined)
      socket.off('new_message', onNew)
      socket.off('message_deleted', onDeleted)
      socket.off('user_typing', onTyping)
      socket.off('user_stop_typing', onStopTyping)
      socket.off('error', onError)
    }
  }, [expenseId])

  // Auto-scroll on new messages.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typingUser])

  const send = (e) => {
    e.preventDefault()
    const content = draft.trim()
    if (!content) return
    getSocket().emit('send_message', { expense_id: expenseId, content })
    setDraft('')
    getSocket().emit('stop_typing', { expense_id: expenseId })
  }

  const onChange = (e) => {
    setDraft(e.target.value)
    const socket = getSocket()
    socket.emit('typing', { expense_id: expenseId })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(
      () => socket.emit('stop_typing', { expense_id: expenseId }),
      1200
    )
  }

  const remove = (messageId) =>
    getSocket().emit('delete_message', { message_id: messageId, expense_id: expenseId })

  return (
    <div className="chatbox">
      <header className="chatbox-header">
        <h4>{expense?.description}</h4>
        <p className="muted">Comments &amp; chat</p>
      </header>

      <div className="chatbox-messages" ref={listRef}>
        {connecting ? (
          <Loader label="Connecting…" />
        ) : messages.length === 0 ? (
          <p className="muted chatbox-empty">No comments yet. Say something!</p>
        ) : (
          messages.map((m) => (
            <MessageItem
              key={m.id}
              message={m}
              isOwn={m.user_id === user?.id}
              onDelete={remove}
            />
          ))
        )}
        {typingUser ? <p className="typing">{typingUser} is typing…</p> : null}
      </div>

      <form className="chatbox-input" onSubmit={send}>
        <input
          className="field-control"
          placeholder="Write a comment…"
          value={draft}
          onChange={onChange}
        />
        <button className="btn btn-primary btn-md" type="submit" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
