import { describe, it, expect, vi, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { getTagWorks } from "./index";

vi.mock('got-scraping', async () => ({
  gotScraping: vi.fn().mockImplementation(async (option: {url: string}) => {
    if(option.url.includes('tags/Top%20Caitlyn%20(League%20of%20Legends)/works')) {
      const mockHtmlPath = path.join(__dirname, 'fixtures', 'tag-CaitlynTop-works.html')
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
    const result = await getTagWorks('Top Caitlyn (League of Legends)')

    console.log(result)
    expect(result).toBeDefined()
    expect(result.works.length).toBe(20)
    expect(result.totalResults).toBe(760)

    expect(result.works[1].id).toBe('62056660')
    expect(result.works[1].title).toBe('Caught Offside')
    expect(result.works[1].author).toBe('Annien')
  })
})