import { describe, it, expect, vi, afterEach } from "vitest"
import { AO3Error, AuthenticationRequiredError, getChapterContent } from "../index.js"
import { promises as fs } from "fs"
import path from "path"
import { gotScraping } from "got-scraping"

vi.mock('got-scraping', async () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string}) => {
    if (options.url.includes('89729749')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'chapter-89729749.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return {
        statusCode: 200,
        body: mockHtml
      }
    } else if (options.url.includes('11111111')) {
      return {
        statusCode: 200,
        body: ""
      }
    } else if (options.url.includes('33333333')) {
      return {
        statusCode: 200,
        body: `
          <html>
            <body>
              <main id="main">
                <h3 class="heading">Log in</h3>
                <div id="loginform">
                  <form class="new_user" id="new_user" action="/users/login" method="post">
                    <label for="user_login">Username or email:</label>
                    <input type="text" name="user[login]" id="user_login">
                    <input type="submit" value="Log in">
                  </form>
                </div>
              </main>
            </body>
          </html>
        `
      }
    }
    else {
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

  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080';
    await getChapterContent('35961484', '89729749', { proxyUrl });
    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.any(String),
      proxyUrl,
    }));
  });

  it('should contain the adult content view flag', async () => {
    await getChapterContent('35961484', '89729749')

    const call = vi.mocked(gotScraping).mock.calls[0][0] as { url: string }
    const params = new URL(call.url).searchParams

    expect(params.get('view_adult')).toBe('true')
  })

  it('should throw AO3Error for an invalid chapter', async () => {
    const workId = '11111111'
    const invalidChapterId = '000000'

    await expect(getChapterContent(workId, invalidChapterId)).rejects.toThrow(AO3Error)
  })

  it('should throw AuthenticationRequiredError for an unauthenticated page', async () => {
    const workId = '33333333'
    const chapterId = '44444444'

    await expect(getChapterContent(workId, chapterId)).rejects.toThrow(AuthenticationRequiredError)
  })
})
