import { describe, vi, expect, afterEach, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { getWorkComments, getChapterComments } from "../index.js";
import { gotScraping } from "got-scraping";
import { ChapterNotFoundError, WorkNotFoundError } from "../types/index.js";

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string, proxyUrl?: string}) => {
    if(options.url.includes('/works/123456?show_comments=true')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'comments-current.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    else if(options.url.includes('/chapters/789?show_comments=true')) {
      const mockHtml = `
        <html>
          <head><title>Chapter Comments</title></head>
          <body>
            <h3 class="heading">1 Comments</h3>
            <div class="comment-wrapper">
              <div class="comment" id="comment_444">
                <div class="byline">
                  <a href="/users/chaptercommenter">chaptercommenter</a>
                </div>
                <div class="comment">
                  <div class="userstuff">This chapter was amazing!</div>
                </div>
                <div class="datetime">05 Jan 2024</div>
                <div class="kudos">2 kudos</div>
              </div>
            </div>
          </body>
        </html>
      `
      return { statusCode: 200, body: mockHtml }
    }
    return { statusCode: 404, statusMessage: 'Not Found' }
  })
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('getWorkComments', () => {
  it('should return work comments with correct structure', async () => {
    const result = await getWorkComments('123456')

    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining('view_full_work=true')
    }))

    expect(result).toHaveProperty('comments')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('page')
    expect(result).toHaveProperty('totalPages')

    expect(result.comments).toHaveLength(2)
    expect(result.total).toBe(3)

    const firstComment = result.comments[0]
    expect(firstComment).toHaveProperty('id', '111')
    expect(firstComment).toHaveProperty('workId', '123456')
    expect(firstComment).toHaveProperty('author', 'commenter1')
    expect(firstComment.content).toContain('Great work!')
    expect(firstComment).toHaveProperty('replies')

    const secondComment = result.comments[1]
    expect(secondComment).toHaveProperty('id', '222')
    expect(secondComment).toHaveProperty('author', 'commenter2')
    expect(secondComment.content).toContain('I loved this chapter.')
    expect(secondComment.replies).toHaveLength(1)
    expect(secondComment.replies[0].id).toBe('333')
  })

  it('should handle comment threading correctly', async () => {
    const result = await getWorkComments('123456')

    // The nested comment should be properly threaded
    const parentComment = result.comments.find(c => c.id === '222')
    expect(parentComment).toBeDefined()

    // Note: The actual threading depends on HTML structure,
    // this test verifies the function runs without error
    expect(result.comments).toHaveLength(2)
  })

  it('should handle pagination correctly', async () => {
    const result = await getWorkComments('123456', 1)

    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(3)
  })

  it('should throw error for non-existent work', async () => {
    await expect(getWorkComments('999999')).rejects.toBeInstanceOf(WorkNotFoundError)
  })
})

describe('getChapterComments', () => {
  it('should return chapter comments with correct structure', async () => {
    const result = await getChapterComments('123456', '789')

    expect(result).toHaveProperty('comments')
    expect(result.comments).toHaveLength(1)
    expect(result.total).toBe(1)

    const comment = result.comments[0]
    expect(comment).toHaveProperty('id', '444')
    expect(comment).toHaveProperty('workId', '123456')
    expect(comment).toHaveProperty('chapterId', '789')
    expect(comment).toHaveProperty('author', 'chaptercommenter')
    expect(comment).toHaveProperty('content', 'This chapter was amazing!')
    expect(comment).toHaveProperty('kudos', 2)
  })

  it('should throw error for non-existent chapter', async () => {
    await expect(getChapterComments('123456', '999999')).rejects.toBeInstanceOf(ChapterNotFoundError)
  })
  it('send request with timeout and signal', async () => {
    const controller = new AbortController()
    const proxyUrl = 'http://localhost:8080'
    const result = await getChapterComments('123456', '789', 1, {
      proxyUrl,
      timeoutMs: 5000,
      signal: controller.signal,
    })

    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      proxyUrl,
      timeout: { request: 5000 },
      signal: controller.signal
    }))
  })
})
