import { describe, it, expect, vi, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { getTagWorks } from "../index.js";
import { gotScraping } from "got-scraping";

vi.mock('got-scraping', async () => ({
  gotScraping: vi.fn().mockImplementation(async (option: {url: string}) => {
    const url = new URL(option.url)
    if(url.pathname === '/works' && url.searchParams.get('tag_id') === 'Top Caitlyn (League of Legends)') {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'tag-CaitlynTop-works.html')
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

describe('getTagWorks', () => {
  it('should return a list of works and total result count for a specific tag', async () => {
    const result = await getTagWorks('Top Caitlyn (League of Legends)', 1)

    expect(result).toBeDefined()
    expect(result.works.length).toBe(20)
    expect(result.totalResults).toBe(760)
    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(38)

    expect(result.works[1].id).toBe('62056660')
    expect(result.works[1].title).toBe('Caught Offside')
    expect(result.works[1].author).toBe('Annien')
  })

  it('should send supported filters using the tag listing parameters', async () => {
    await getTagWorks('Top Caitlyn (League of Legends)', 2, {
      query: 'coffee shop',
      complete: true,
      wordsFrom: 1000,
      wordsTo: 5000,
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      language: 'en',
      otherTags: ['Fluff', 'Happy Ending'],
      ratings: ['Teen And Up Audiences'],
      warnings: ['Major Character Death'],
      categories: ['F/F'],
      sortColumn: 'Kudos'
    })

    const call = vi.mocked(gotScraping).mock.calls[0][0] as { url: string }
    const url = new URL(call.url)

    expect(url.pathname).toBe('/works')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('tag_id')).toBe('Top Caitlyn (League of Legends)')
    expect(url.searchParams.get('work_search[query]')).toBe('coffee shop')
    expect(url.searchParams.get('work_search[complete]')).toBe('T')
    expect(url.searchParams.get('work_search[words_from]')).toBe('1000')
    expect(url.searchParams.get('work_search[words_to]')).toBe('5000')
    expect(url.searchParams.get('work_search[date_from]')).toBe('2025-01-01')
    expect(url.searchParams.get('work_search[date_to]')).toBe('2025-12-31')
    expect(url.searchParams.get('work_search[language_id]')).toBe('en')
    expect(url.searchParams.get('work_search[other_tag_names]')).toBe('Fluff,Happy Ending')
    expect(url.searchParams.getAll('include_work_search[rating_ids][]')).toEqual(['11'])
    expect(url.searchParams.getAll('include_work_search[archive_warning_ids][]')).toEqual(['18'])
    expect(url.searchParams.getAll('include_work_search[category_ids][]')).toEqual(['116'])
    expect(url.searchParams.get('work_search[sort_column]')).toBe('kudos_count')
  })

  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080';
    await getTagWorks('Top Caitlyn (League of Legends)', 1, undefined, { proxyUrl });
    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.any(String),
      proxyUrl,
    }));
  });
})
