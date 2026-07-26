import { describe, it, expect, vi, afterAll, afterEach } from 'vitest';
import { promises as fs } from 'fs'
import path from 'path'
import { getWork, type Work, AO3Error, WorkNotFoundError, getChapters, AuthenticationRequiredError } from '../index.js'
import { gotScraping } from 'got-scraping';

vi.mock('got-scraping', () => {
  return {
    gotScraping: vi.fn().mockImplementation(async (options: { url: string }) => {
      console.log(`[Mock] Intercepted request to: ${options.url}`)

      const workId = options.url.split('/works/')[1].split('?')[0]

      if (workId === '35961484') {
        const mockHtmlPath = path.join(__dirname, '../fixtures', 'work-35961484.html')
        const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')

        return Promise.resolve({
          statusCode: 200,
          body: mockHtml
        })
      } else if (workId === '111111') {
        return Promise.resolve({
          statusCode: 200,
          body: ''
        })
      } else if (workId === '222222') {
        return Promise.resolve({
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
        })
      }
      else {
        return Promise.resolve({
          statusCode: 404,
          statusMessage: 'Not Found'
        })
      }
    })
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getWork', () => {

  it.concurrent('should return work details for a valid work ID', async () => {
    const workId = '35961484'

    const work: Work = await getWork(workId)
    console.log(work)

    expect(work).toBeDefined()
    expect(work.id).toBe(workId)
    expect(typeof work.title).toBe('string')
    expect(work.title).not.toBe('')
    expect(typeof work.author).toBe('string')
    expect(work.author).not.toBe('')
    expect(work.stats.updated).toBe('2021-12-27')
    expect(Array.isArray(work.tags.fandoms)).toBe(true)
  })

  it.concurrent('should throw an error for an invalid workID using mock', async() => {
    const invalidWorkId = '000000'

    await expect(getWork(invalidWorkId)).rejects.toThrow(
      new WorkNotFoundError(invalidWorkId)
    )
  })

  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080';
    await getWork('35961484', { proxyUrl });
    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.any(String),
      proxyUrl,
    }));
  });

  it('should reject an empty work page', async () => {
    await expect(getWork('111111')).rejects.toBeInstanceOf(AO3Error)
  })

  it('should reject an empty chapter-list page', async () => {
    await expect(getChapters('111111')).rejects.toBeInstanceOf(AO3Error)
  })

  it('should reject an authentication required error', async () => {
    await expect(getWork('222222')).rejects.toBeInstanceOf(AuthenticationRequiredError)
  })

  it('should reject an authentication required error', async () => {
    await expect(getChapters('222222')).rejects.toBeInstanceOf(AuthenticationRequiredError)
  })
})
