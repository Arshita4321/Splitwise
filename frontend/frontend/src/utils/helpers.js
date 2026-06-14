// Returns the initials for an avatar bubble.
export const initials = (name = '?') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

// Deterministic color from a string (for avatars).
export const colorFromString = (str = '') => {
  const palette = [
    '#1cc29f',
    '#2f80ed',
    '#eb5757',
    '#f2994a',
    '#9b51e0',
    '#219653',
    '#bb6bd9',
    '#56ccf2',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1)

// Sum the amount_owed across an expense's splits.
export const sumSplits = (splits = []) =>
  splits.reduce((acc, s) => acc + Number(s.amount_owed || 0), 0)
