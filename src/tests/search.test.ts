import { describe, it, expect, vi, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { search, SearchOptions } from '../index.js'
import { gotScraping } from 'got-scraping'

const allParams: SearchOptions = {
  query: 'test query',
  title: 'test title',
  creators: 'test creators',
  revisedAt: '2022-01-01',
  complete: true,
  singleChapter: true,
  wordCount: '>1000',
  language: 'en',
  hits: '>100',
  kudos: '>50',
  comments: '>10',
  bookmarks: '>5',
  fandoms: ['fandom1', 'fandom2'],
  characters: ['char1', 'char2'],
  relationships: ['rel1', 'rel2'],
  freeforms: ['free1', 'free2'],
  ratings: ['Teen And Up Audiences'],
  warnings: ['Major Character Death'],
  categories: ['F/F'],
  sortColumn: 'Kudos',
  sortDirection: 'asc'
}

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

  it('should build a URL with all parameters', async () => {
    const results = await search(allParams)

    expect(results).toBeDefined()
  })

  it('should build a URL with all parameters except complete', async () => {
    const results = await search({
      ...allParams,
      complete: false,
    })

    expect(results).toBeDefined()
  })
  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080';
    await search({ query: 'test' }, { proxyUrl });
    expect(gotScraping).toHaveBeenCalledWith({
      url: expect.any(String),
      proxyUrl,
    });
  });
})