import { SimpleCache } from '../cache'

describe('SimpleCache', () => {
  let cache: SimpleCache

  beforeEach(() => {
    cache = new SimpleCache()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('get/set', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return null for missing keys', () => {
      expect(cache.get('nonexistent')).toBeNull()
    })

    it('should store objects', () => {
      const obj = { name: 'test', count: 42 }
      cache.set('obj', obj)
      expect(cache.get('obj')).toEqual(obj)
    })

    it('should overwrite existing keys', () => {
      cache.set('key', 'first')
      cache.set('key', 'second')
      expect(cache.get('key')).toBe('second')
    })
  })

  describe('TTL expiration', () => {
    it('should return null for expired entries', () => {
      cache.set('key', 'value', 1000) // 1 second TTL
      jest.advanceTimersByTime(1001)
      expect(cache.get('key')).toBeNull()
    })

    it('should return value before TTL expires', () => {
      cache.set('key', 'value', 5000)
      jest.advanceTimersByTime(4999)
      expect(cache.get('key')).toBe('value')
    })

    it('should use default TTL of 5 minutes', () => {
      cache.set('key', 'value')
      jest.advanceTimersByTime(4 * 60 * 1000) // 4 minutes
      expect(cache.get('key')).toBe('value')

      jest.advanceTimersByTime(2 * 60 * 1000) // 2 more minutes (total 6)
      expect(cache.get('key')).toBeNull()
    })
  })

  describe('delete', () => {
    it('should remove an entry', () => {
      cache.set('key', 'value')
      cache.delete('key')
      expect(cache.get('key')).toBeNull()
    })

    it('should not throw when deleting non-existent key', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow()
    })
  })

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('a')).toBeNull()
    })
  })

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.size()).toBe(0)
    })

    it('should track entry count', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      expect(cache.size()).toBe(2)
    })
  })

  describe('eviction', () => {
    it('should evict oldest entry when max size is reached', () => {
      // Default max size is 100
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, i)
      }
      expect(cache.size()).toBe(100)

      // Adding one more should evict the first
      cache.set('overflow', 'new')
      expect(cache.size()).toBe(100)
      expect(cache.get('key0')).toBeNull() // evicted
      expect(cache.get('overflow')).toBe('new')
    })
  })

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      cache.set('short', 'value', 1000)
      cache.set('long', 'value', 10000)

      jest.advanceTimersByTime(2000)
      cache.cleanup()

      expect(cache.size()).toBe(1)
      expect(cache.get('short')).toBeNull()
      expect(cache.get('long')).toBe('value')
    })
  })
})
