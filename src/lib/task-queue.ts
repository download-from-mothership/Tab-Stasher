/**
 * Simple in-memory concurrency-limited task queue for expensive operations.
 *
 * Prevents overloading external APIs (Gemini, Vision, Firecrawl) by limiting
 * the number of concurrent requests per operation type.
 *
 * For production at scale, replace with Cloudflare Queues or a persistent
 * queue backend. This implementation is suitable for single-instance
 * or per-isolate concurrency control.
 */

interface QueuedTask<T> {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: any) => void
}

export class TaskQueue {
  private queues = new Map<string, QueuedTask<any>[]>()
  private running = new Map<string, number>()
  private concurrency: number

  constructor(concurrency = 3) {
    this.concurrency = concurrency
  }

  /**
   * Enqueue a task under a named channel with concurrency control.
   * Returns a promise that resolves when the task completes.
   */
  enqueue<T>(channel: string, fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.queues.has(channel)) {
        this.queues.set(channel, [])
        this.running.set(channel, 0)
      }

      this.queues.get(channel)!.push({ fn, resolve, reject })
      this.drain(channel)
    })
  }

  private drain(channel: string): void {
    const queue = this.queues.get(channel)
    const running = this.running.get(channel) ?? 0

    if (!queue || queue.length === 0 || running >= this.concurrency) return

    const task = queue.shift()!
    this.running.set(channel, running + 1)

    task
      .fn()
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        this.running.set(channel, (this.running.get(channel) ?? 1) - 1)
        this.drain(channel)
      })
  }

  /** Number of tasks waiting in a channel. */
  pending(channel: string): number {
    return this.queues.get(channel)?.length ?? 0
  }

  /** Number of tasks currently running in a channel. */
  active(channel: string): number {
    return this.running.get(channel) ?? 0
  }
}

/**
 * Global task queue instance.
 * Channels: 'ai' (Gemini), 'ocr' (Vision API), 'scrape' (Firecrawl)
 */
export const taskQueue = new TaskQueue(3)
