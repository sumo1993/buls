// Simple client-side cache for API responses
class ClientCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>
  
  constructor() {
    this.cache = new Map()
  }

  set(key: string, data: any, ttl: number = 30000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    
    if (!cached) {
      return null
    }

    const now = Date.now()
    const age = now - cached.timestamp

    if (age > cached.ttl) {
      // Cache expired
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  has(key: string): boolean {
    const cached = this.cache.get(key)
    
    if (!cached) {
      return false
    }

    const now = Date.now()
    const age = now - cached.timestamp

    if (age > cached.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  invalidate(key: string) {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string) {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }

  clear() {
    this.cache.clear()
  }
}

// Export singleton instance
export const clientCache = new ClientCache()

// Helper function for cached fetch
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 30000
): Promise<T> {
  // Check cache first
  const cached = clientCache.get(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()
  
  // Store in cache
  clientCache.set(key, data, ttl)
  
  return data
}
