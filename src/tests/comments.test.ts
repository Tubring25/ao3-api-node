import { describe, vi, expect, afterEach, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { getWorkComments, getChapterComments, getAllWorkComments } from "../index.js";
import { gotScraping } from "got-scraping";
import { parseCommentList } from "../lib/parsers.js";
import { AO3Error, ChapterNotFoundError, WorkNotFoundError } from "../types/index.js";

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string, proxyUrl?: string}) => {
    if(options.url.includes('/works/654321?show_comments=true')) {
      const page = new URL(options.url).searchParams.get('page') || '1'
      const isSecondPage = page === '2'
      const commentId = isSecondPage ? '200' : '100'
      const parentLink = isSecondPage
        ? '<ul class="actions"><li><a href="/comments/100">Parent</a></li></ul>'
        : ''
      const mockHtml = `
        <html>
          <body>
            <a href="/comments/hide_comments">Hide Comments (2)</a>
            <ol class="pagination actions">
              <li><span class="current">${page}</span></li>
              <li><a href="?page=2">2</a></li>
            </ol>
            <li class="thread" id="thread_100">
              <ol>
                <li class="comment" id="comment_${commentId}">
                  <h4 class="byline">
                    <a href="/users/commenter-${commentId}">commenter-${commentId}</a>
                  </h4>
                  <blockquote class="userstuff">Comment ${commentId}</blockquote>
                  <p class="datetime">01 Jan 2026</p>
                  ${parentLink}
                </li>
              </ol>
            </li>
          </body>
        </html>
      `
      return {
        statusCode: 200,
        body: `<div id="main" class="works-show region">${mockHtml}</div>`
      }
    }
    else if(options.url.includes('/works/123456?show_comments=true')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'comments-current.html')
      const fixture = await fs.readFile(mockHtmlPath, 'utf-8')
      const mockHtml = `<div id="main" class="works-show region">${fixture}</div>`
      return { statusCode: 200, body: mockHtml }
    }
    else if(options.url.includes('/works/111111?show_comments=true')) {
      return { statusCode: 200, body: '<html><body>Invalid page</body></html>' }
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
      return {
        statusCode: 200,
        body: `<div id="main" class="chapters-show region">${mockHtml}</div>`
      }
    }
    else if(options.url.includes('/chapters/111?show_comments=true')) {
      return { statusCode: 200, body: '<html><body>Invalid page</body></html>' }
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

  it('should throw AO3Error for an invalid work comments page', async () => {
    await expect(getWorkComments('111111')).rejects.toBeInstanceOf(AO3Error)
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

  it('should throw AO3Error for an invalid chapter comments page', async () => {
    await expect(getChapterComments('123456', '111')).rejects.toBeInstanceOf(AO3Error)
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

describe('parseCommentList', () => {
  it.each(['works-show', 'chapters-show'])('returns empty results for a valid %s page', pageClass => {
    const html = `<div id="main" class="${pageClass} region"></div>`

    expect(parseCommentList(html)).toEqual({
      comments: [],
      total: 0,
      page: 1,
      totalPages: 1
    })
  })

  it('rejects an invalid comments page', () => {
    expect(() => parseCommentList('<html><body>Invalid page</body></html>')).toThrow(AO3Error)
  })
})

describe('getAllWorkComments', () => {
  it('should get all comments in multiple pages', async () => {
    const result = await getAllWorkComments('654321')

    expect(result.total).toBe(2)
    expect(result.totalPages).toBe(2)
    expect(result.comments).toHaveLength(1)
    expect(result.comments[0].id).toBe('100')
    expect(result.comments[0].workId).toBe('654321')
    expect(result.comments[0].replies[0].id).toBe('200')
    expect(result.comments[0].replies[0].workId).toBe('654321')
    expect(result.comments[0].replies[0].depth).toBe(1)
    expect(gotScraping).toHaveBeenCalledTimes(2)

    const requestedPages = vi.mocked(gotScraping).mock.calls.map(([options]) => {
      return new URL((options as { url: string }).url).searchParams.get('page')
    })
    expect(requestedPages).toEqual(['1', '2'])
  })
})
