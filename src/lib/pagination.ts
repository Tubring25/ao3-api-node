
export interface PaginationResult {
  page: number
  totalPages: number
}

export interface IteratePagesOptions {
  startPage?: number
  maxPages?: number
}

export const iteratePages = async function*<T extends PaginationResult>(
  fetchPage: (page: number) => Promise<T>,
  options?: IteratePagesOptions
): AsyncGenerator<T> {
  let page = options?.startPage ?? 1
  let fetchedPages = 0

  while (options?.maxPages === undefined || fetchedPages < options.maxPages) {
    const result = await fetchPage(page)
    yield result
    fetchedPages++
    if (page >= result.totalPages) return
    page++
  }
}
