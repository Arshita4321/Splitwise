import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Avatar from '../ui/Avatar.jsx';
import Spinner from '../ui/Spinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../hooks/useToast.js';

export default function ExpenseChat({ expenseId }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [typingUser, setTypingUser] = useState(null);

  const socketRef = useRef(null);
  const bottomRef  = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io('/', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_expense', { expense_id: expenseId });
    });

    socket.on('joined', ({ messages: initial }) => {
      setMessages(initial || []);
      setLoading(false);
    });

    socket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('message_deleted', ({ message_id }) => {
      setMessages(prev => prev.filter(m => m.id !== message_id));
    });

    socket.on('user_typing', ({ user_id, name }) => {
      if (user_id !== user?.id) setTypingUser(name);
    });

    socket.on('user_stop_typing', () => setTypingUser(null));

    socket.on('error', (msg) => {
      toast({ type: 'error', message: typeof msg === 'string' ? msg : 'Chat error' });
      setLoading(false);
    });

    socket.on('connect_error', () => {
      toast({ type: 'error', message: 'Could not connect to chat' });
      setLoading(false);
    });

    return () => {
      socket.emit('leave_expense', { expense_id: expenseId });
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    socketRef.current?.emit('send_message', { expense_id: expenseId, content });
    socketRef.current?.emit('stop_typing', { expense_id: expenseId });
    setText('');
  };

  const handleChange = (e) => {
    setText(e.target.value);
    socketRef.current?.emit('typing', { expense_id: expenseId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { expense_id: expenseId });
    }, 1500);
  };

  const handleDelete = (messageId) => {
    socketRef.current?.emit('delete_message', { message_id: messageId, expense_id: expenseId });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '420px' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 2px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <Spinner size={24} />
          </div>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: '13px', padding: '32px 0' }}>
            No messages yet. Say something about this expense.
          </p>
        ) : (
          messages.map(m => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                flexDirection: mine ? 'row-reverse' : 'row',
              }}>
                <Avatar name={m.user_name} size={28} />
                <div style={{
                  maxWidth: '75%', display: 'flex', flexDirection: 'column',
                  alignItems: mine ? 'flex-end' : 'flex-start', gap: '2px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                      {mine ? 'You' : m.user_name} · {format(new Date(m.created_at), 'HH:mm')}
                    </span>
                    {mine && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        style={{ color: 'var(--text-3)', display: 'flex' }}
                        title="Delete message"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <div style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    background: mine ? 'var(--accent)' : 'var(--surface-2)',
                    color: mine ? '#fff' : 'var(--text-1)',
                    fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word',
                  }}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {typingUser && (
        <p style={{ fontSize: '12px', color: 'var(--text-2)', padding: '4px 2px' }}>
          {typingUser} is typing…
        </p>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <input
          value={text}
          onChange={handleChange}
          placeholder="Write a message…"
          style={{
            flex: 1, padding: '10px 14px', background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)',
            color: 'var(--text-1)', fontSize: '13px',
          }}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--accent)', color: '#fff', flexShrink: 0,
            opacity: text.trim() ? 1 : 0.5,
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
