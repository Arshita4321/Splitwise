export default function Loader({ label = 'Loading…', full = false }) {
  return (
    <div className={full ? 'loader-full' : 'loader'}>
      <span className="loader-spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
