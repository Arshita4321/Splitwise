import { createContext, useCallback, useContext, useState, createElement } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'info') => {
      const id = ++idCounter
      setToasts((t) => [...t, { id, message, type }])
      setTimeout(() => remove(id), 4000)
    },
    [remove]
  )

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }

  return createElement(
    ToastContext.Provider,
    { value: toast },
    children,
    createElement(
      'div',
      { className: 'toast-stack' },
      toasts.map((t) =>
        createElement(
          'div',
          { key: t.id, className: `toast toast-${t.type}`, onClick: () => remove(t.id) },
          t.message
        )
      )
    )
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
