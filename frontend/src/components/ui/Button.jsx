import React from 'react';

const styles = {
  base: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', fontWeight: 500, borderRadius: '10px',
    transition: 'all 150ms ease', fontSize: '14px', lineHeight: 1,
    padding: '10px 18px', cursor: 'pointer', border: 'none',
  },
  primary: {
    background: '#6366f1', color: '#fff',
  },
  ghost: {
    background: 'transparent', color: '#8b98a8', border: '1px solid #2a3240',
  },
  danger: {
    background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)',
  },
  sm: { padding: '7px 14px', fontSize: '13px', borderRadius: '8px' },
  lg: { padding: '13px 24px', fontSize: '15px' },
};

export default function Button({ variant = 'primary', size, children, style, ...props }) {
  const combined = {
    ...styles.base,
    ...styles[variant],
    ...(size ? styles[size] : {}),
    ...(props.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
    ...style,
  };
  return (
    <button style={combined} {...props}>
      {children}
    </button>
  );
}