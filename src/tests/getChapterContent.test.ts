import { describe, it, expect, vi, afterEach } from "vitest"
import { getChapterContent } from "../index.js"
import { promises as fs } from "fs"
import path from "path"

vi.mock('got-scraping', async () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string}) => {
    if (options.url.includes('89729749')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'chapter-89729749.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return {
        statusCode: 200,
        body: mockHtml
      }
    } else {
      return {
        statusCode: 404,
        statusMessage: 'Not Found'
      }
    }
  })
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('getChapterContent', () => { 
  it('should return the content of a specific chapter', async () => {
    const workId = '35961484'
    const chapterId = '89729749'
    
    const chapterContent = await getChapterContent(workId, chapterId)

    console.log(chapterContent)

    expect(chapterContent).toBeDefined()
    expect(chapterContent.workId).toBe(workId)
    expect(chapterContent.chapterId).toBe(chapterId)
    expect(chapterContent.title).toBe('Chapter 2')
    expect(chapterContent.content.length).toBeGreaterThan(100)
    expect(chapterContent.content).toContain('Careful up there!')
  })

  it('should throw an error for an invalid chapter', async () => {
    const workId = '35961484'
    const invalidChapterId = '000000'

    await expect(getChapterContent(workId, invalidChapterId)).rejects.toThrow()
  })
})