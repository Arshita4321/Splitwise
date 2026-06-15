import { useState, useEffect, useCallback } from 'react';

let _id = 0;
let _toasts = [];
const listeners = new Set();

function emit() {
  listeners.forEach(fn => fn(_toasts));
}

/**
 * Push a toast notification. Can be called from anywhere (components,
 * API layers, etc.) — not just inside a React render.
 */
export function pushToast({ message, type = 'info', duration = 3500 }) {
  const id = ++_id;
  _toasts = [..._toasts, { id, message, type }];
  emit();
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
    emit();
  }, duration);
  return id;
}

export function dismissToast(id) {
  _toasts = _toasts.filter(t => t.id !== id);
  emit();
}

export function useToast() {
  const [toasts, setToasts] = useState(_toasts);

  useEffect(() => {
    listeners.add(setToasts);
    return () => listeners.delete(setToasts);
  }, []);

  const toast = useCallback((opts) => pushToast(opts), []);
  const dismiss = useCallback((id) => dismissToast(id), []);

  return { toasts, toast, dismiss };
}
