import { describe, it, expect, vi, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { CrossoverMode, search, SearchOptions } from '../index.js'
import { gotScraping } from 'got-scraping'

const allParams: SearchOptions = {
  page: 2,
  query: 'test query',
  title: 'test title',
  creators: 'test creators',
  revisedAt: '2022-01-01',
  complete: true,
  crossover: 'exclude',
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
  rating: 'Teen And Up Audiences',
  warnings: ['Major Character Death'],
  categories: ['F/F'],
  sortColumn: 'Kudos',
  sortDirection: 'asc'
}

const crossoverCases: Array<[CrossoverMode, string]> = [
  ['include', ''],
  ['exclude', 'F'],
  ['only', 'T'],
]

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
    const results = await search({ query: 'Kiss me, Cupcake' })

    expect(results).toBeDefined()
    expect(results.works.length).toBe(20)
    expect(results.totalResults).toBeGreaterThan(20)
    expect(results.page).toBe(1)
    expect(results.totalPages).toBe(2)

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
    const call = vi.mocked(gotScraping).mock.calls[0][0] as { url: string }
    const params = new URL(call.url).searchParams
    expect(params.get('page')).toBe('2')
    expect(params.get('work_search[crossover]')).toBe('F')
    expect(params.get('work_search[rating_ids]')).toBe('11')
    expect(params.get('work_search[rating_ids][]')).toBe(null)
    expect(params.get('work_search[fandom_names]')).toBe('fandom1,fandom2')
    expect(params.get('work_search[character_names]')).toBe('char1,char2')
    expect(params.get('work_search[relationship_names]')).toBe('rel1,rel2')
    expect(params.get('work_search[freeform_names]')).toBe('free1,free2')
    expect(params.get('work_search[archive_warning_ids][]')).toBe('18')
    expect(params.get('work_search[category_ids][]')).toBe('116')
  })

  it('should build a URL with complete set to false', async () => {
    const results = await search({
      ...allParams,
      complete: false,
    })

    expect(results).toBeDefined()
    const call = vi.mocked(gotScraping).mock.calls[0][0] as { url: string }
    const params = new URL(call.url).searchParams

    expect(params.get('work_search[complete]')).toBe('F')
  })
  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080';
    await search({ query: 'test' }, { proxyUrl });
    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.any(String),
      proxyUrl,
    }));
  });

  it.each(crossoverCases)('should encode crossover modes', async(mode: string, expected: string) => {
    const result = await search({
      ...allParams,
      crossover: mode as CrossoverMode,
    })

    expect(result).toBeDefined()
    const call = vi.mocked(gotScraping).mock.calls[0][0] as { url: string }
    const params = new URL(call.url).searchParams
    expect(params.get('work_search[crossover]')).toBe(expected)
  })
})
