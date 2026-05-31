const API_BASE = typeof __API_BASE__ !== 'undefined' && __API_BASE__ 
  ? __API_BASE__ 
  : (import.meta.env.VITE_API_BASE || '')

export const apiUrl = (path) => `${API_BASE}${path}`
