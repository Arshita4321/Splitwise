import { formatTime } from '../../utils/formatters'
import { initials, colorFromString } from '../../utils/helpers'

export default function MessageItem({ message, isOwn, onDelete }) {
  return (
    <div className={`msg ${isOwn ? 'msg-own' : ''}`}>
      {!isOwn ? (
        <div
          className="msg-avatar"
          style={{ background: colorFromString(message.user_name || '?') }}
          aria-hidden="true"
        >
          {initials(message.user_name || '?')}
        </div>
      ) : null}

      <div className="msg-bubble">
        {!isOwn ? <span className="msg-author">{message.user_name}</span> : null}
        <p className="msg-text">{message.content}</p>
        <span className="msg-time">
          {formatTime(message.created_at)}
          {isOwn ? (
            <button
              className="msg-delete"
              onClick={() => onDelete?.(message.id)}
              aria-label="Delete message"
            >
              Delete
            </button>
          ) : null}
        </span>
      </div>
    </div>
  )
}
