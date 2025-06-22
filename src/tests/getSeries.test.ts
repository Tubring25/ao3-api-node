import { describe, vi, expect, afterEach, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { getSeries } from "../index.js";

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string, proxyUrl?: string}) => {
    if (options.url.includes('/series/4001494')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'series-4001494.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    return { statusCode: 404, statusMessage: 'Not Found' }
  })
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('getSeries', () => {
  it('should return details for a valid series ID', async () => {
    const seriesId = '4001494'
    const series = await getSeries(seriesId)

    expect(series).toBeDefined()
    expect(series.id).toBe('4001494')
    expect(series.title).toBe('if I was with you I could say amen.')
    expect(series.authors).toEqual(['TheHomelyBadger'])
    expect(Array.isArray(series.works)).toBe(true)
    expect(series.works.length).toBe(3)
  })
})