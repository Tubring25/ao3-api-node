import { describe, it, expect, vi, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { search } from '../index.js'

vi.mock('got-scraping', async () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string}) => {
    if (options.url.includes('/works/search')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'search-results.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return {
        statusCode: 200,
        body: mockHtml
      }
    }
    return {
      statusCode: 404,
      statusMessage: 'Not Found'
    }
  })
}))

afterEach(() => {
  vi.clearAllMocks()
})
describe('search', () => {
  it('should return a list of works and total result count form a search query', async () => {
    const results = await search({query: 'Kiss me, Cupcake'})

    console.log(results)

    expect(results).toBeDefined()
    expect(results.works.length).toBe(20)
    expect(results.totalResults).toBeGreaterThan(20)
    
    const firstWork = results.works[0]
    expect(firstWork.id).toBe('35473240')
    expect(firstWork.title).toBe('Kiss me, cupcake')
    expect(firstWork.author).toBe('Eowima')
    expect(firstWork.fandoms).toContain('Arcane: League of Legends (Cartoon 2021)')
    expect(firstWork.kudos).toBe(3409)
  })
})