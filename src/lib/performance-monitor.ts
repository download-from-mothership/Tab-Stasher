export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Time an async operation and log if it takes too long
   */
  async timeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    thresholdMs: number = 1000
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await operation()
      const duration = Date.now() - startTime
      
      this.recordMetric(operationName, duration)
      
      if (duration > thresholdMs) {
        console.warn(`⚠️  Slow operation detected: ${operationName} took ${duration}ms`)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Operation failed: ${operationName} failed after ${duration}ms`, error)
      throw error
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(operationName: string, durationMs: number): void {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, [])
    }
    
    this.metrics.get(operationName)!.push(durationMs)
    
    // Keep only last 100 measurements
    const measurements = this.metrics.get(operationName)!
    if (measurements.length > 100) {
      this.metrics.set(operationName, measurements.slice(-100))
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operationName: string): {
    count: number
    avg: number
    min: number
    max: number
    p95: number
  } | null {
    const measurements = this.metrics.get(operationName)
    if (!measurements || measurements.length === 0) {
      return null
    }

    const sorted = [...measurements].sort((a, b) => a - b)
    const count = sorted.length
    const avg = sorted.reduce((sum, val) => sum + val, 0) / count
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const p95Index = Math.floor(count * 0.95)
    const p95 = sorted[p95Index]

    return { count, avg, min, max, p95 }
  }

  /**
   * Log all performance statistics
   */
  logAllStats(): void {
    console.log('📊 Performance Statistics:')
    for (const [operationName, measurements] of this.metrics) {
      const stats = this.getStats(operationName)
      if (stats) {
        console.log(`  ${operationName}:`)
        console.log(`    Count: ${stats.count}`)
        console.log(`    Avg: ${stats.avg.toFixed(2)}ms`)
        console.log(`    Min: ${stats.min}ms`)
        console.log(`    Max: ${stats.max}ms`)
        console.log(`    P95: ${stats.p95}ms`)
      }
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear()
  }
}

// Convenience function for timing operations
export async function timeOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  thresholdMs: number = 1000
): Promise<T> {
  return PerformanceMonitor.getInstance().timeOperation(operationName, operation, thresholdMs)
} 