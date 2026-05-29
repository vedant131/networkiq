// Shared API base URL
// In production: points to Render backend
// In development: empty string (Vite proxy handles /api/* → localhost:8000)
const API_BASE = import.meta.env.PROD 
  ? 'https://linkedin-network-intelligence.onrender.com'
  : ''

export const apiUrl = (path) => `${API_BASE}${path}`
