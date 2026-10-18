// Browser-based Supabase proxy to work around SSL issues
// This makes requests from the browser instead of Node.js

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function supabaseQuery(
  table: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    select?: string
    body?: any
    eq?: Record<string, any>
    id?: string
  } = {}
) {
  const { method = 'GET', select = '*', body, eq, id } = options
  
  let url = `${SUPABASE_URL}/rest/v1/${table}`
  
  // Add select parameter
  if (method === 'GET') {
    url += `?select=${select}`
    
    // Add equality filters
    if (eq) {
      Object.entries(eq).forEach(([key, value]) => {
        url += `&${key}=eq.${value}`
      })
    }
  }
  
  // Add ID for specific resource
  if (id) {
    url += `?id=eq.${id}`
  }
  
  const headers: HeadersInit = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  
  const fetchOptions: RequestInit = {
    method,
    headers
  }
  
  if (body && (method === 'POST' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(body)
  }
  
  const response = await fetch(url, fetchOptions)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Supabase query failed')
  }
  
  return response.json()
}
