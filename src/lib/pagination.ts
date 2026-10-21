import { setTimeout as delay } from 'node:timers/promises'

export interface PaginationResult {
  page: number
  totalPages: number
}

export interface IteratePagesOptions {
  startPage?: number
  maxPages?: number
  /** Milliseconds to wait before each page after the first. Defaults to 0. */
  delayMs?: number
  /** Cancels a pending delay between pages. */
  signal?: AbortSignal
}

export const iteratePages = async function*<T extends PaginationResult>(
  fetchPage: (page: number) => Promise<T>,
  options?: IteratePagesOptions
): AsyncGenerator<T> {
  let page = options?.startPage ?? 1
  let fetchedPages = 0

  while (options?.maxPages === undefined || fetchedPages < options.maxPages) {
    if (fetchedPages > 0 && options?.delayMs) {
      await delay(options.delayMs, undefined, { signal: options.signal })
    }
    const result = await fetchPage(page)
    yield result
    fetchedPages++
    if (page >= result.totalPages) return
    page++
  }
}
