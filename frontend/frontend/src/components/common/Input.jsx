export default function Input({
  label,
  id,
  error,
  className = '',
  as = 'input',
  options = [],
  ...rest
}) {
  const inputId = id || rest.name

  return (
    <div className={`field ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      ) : null}

      {as === 'select' ? (
        <select id={inputId} className={`field-control ${error ? 'has-error' : ''}`} {...rest}>
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
      ) : (
        <input id={inputId} className={`field-control ${error ? 'has-error' : ''}`} {...rest} />
      )}

      {error ? <span className="field-error">{error}</span> : null}
    </div>
  )
}
