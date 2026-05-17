export const MALAYSIAN_STATES = [
  '',
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'W.P. Kuala Lumpur',
  'W.P. Putrajaya',
  'W.P. Labuan',
]

export const API_BASE = import.meta.env.VITE_API_BASE

export const shorten = (text, max = 120) => {
  if (!text) return '-'
  const t = String(text)
  return t.length > max ? `${t.slice(0, max - 1)}...` : t
}
