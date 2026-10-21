import { describe, expect, it, vi } from "vitest";
import { iteratePages, type PaginationResult } from "../lib/pagination.js";

interface TestPage extends PaginationResult {
  works: string[]
}

describe('iteratePages', () => {
  it('iterates through every page', async () => {
    const fetchPage = vi.fn(
      async (page: number): Promise<TestPage> => {
        return {
          works: [`work-${page}`],
          page: page,
          totalPages: 3
        };
      }
    )

    const pages: TestPage[] = []

    for await (const page of iteratePages(fetchPage)) {
      pages.push(page)
    }

    expect(pages.map(page => page.page)).toEqual([1, 2, 3])
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(fetchPage.mock.calls.map(([page]) => page)).toEqual([1, 2, 3])
  })

  it('iterate start with custom start page', async () => {
    const fetchPage = vi.fn(
      async (page: number): Promise<TestPage> => {
        return {
          works: [`work-${page}`],
          page: page,
          totalPages: 3
        };
      }
    )
    const pages: TestPage[] = []

    for await (const page of iteratePages(fetchPage, {startPage: 2})) {
      pages.push(page)
    }

    expect(pages.map(page => page.page)).toEqual([2, 3])
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage.mock.calls.map(([page]) => page)).toEqual([2, 3])
  })

  it('iterate max pages', async () => {
    const fetchPage = vi.fn(
      async (page: number): Promise<TestPage> => {
        return {
          works: [`work-${page}`],
          page: page,
          totalPages: 5
        };
      }
    )
    const pages: TestPage[] = []

    for await (const page of iteratePages(fetchPage, {maxPages: 2})) {
      pages.push(page)
    }

    expect(pages.map(page => page.page)).toEqual([1, 2])
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage.mock.calls.map(([page]) => page)).toEqual([1, 2])
  })

  it('iterate with single page', async () => {
    const fetchPage = vi.fn(
      async (page: number): Promise<TestPage> => {
        return {
          works: [`work-${page}`],
          page: page,
          totalPages: 1
        };
      }
    )
    const pages: TestPage[] = []

    for await (const page of iteratePages(fetchPage)) {
      pages.push(page)
    }

    expect(pages.map(page => page.page)).toEqual([1])
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage.mock.calls.map(([page]) => page)).toEqual([1])
  })

  it('waits between pages but not before the first page', async () => {
    const requestedAt: number[] = []
    const fetchPage = async (page: number): Promise<TestPage> => {
      requestedAt.push(Date.now())
      return { works: [], page, totalPages: 3 }
    }
    const startedAt = Date.now()

    for await (const _page of iteratePages(fetchPage, { delayMs: 50 })) {
      // consume every page
    }

    expect(requestedAt).toHaveLength(3)
    expect(requestedAt[0] - startedAt).toBeLessThan(40)
    expect(requestedAt[1] - requestedAt[0]).toBeGreaterThanOrEqual(45)
    expect(requestedAt[2] - requestedAt[1]).toBeGreaterThanOrEqual(45)
  })

  it('stops a pending delay when the signal aborts', async () => {
    const controller = new AbortController()
    const fetchPage = vi.fn(async (page: number): Promise<TestPage> => {
      return { works: [], page, totalPages: 3 }
    })

    const iterate = async () => {
      for await (const _page of iteratePages(fetchPage, { delayMs: 10_000, signal: controller.signal })) {
        controller.abort()
      }
    }

    await expect(iterate()).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})
