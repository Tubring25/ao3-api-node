import { describe, it, expect, vi, afterAll, afterEach } from 'vitest';
import { promises as fs } from 'fs'
import path from 'path'
import { getWork, type Work, AO3Error, WorkNotFoundError, getChapters, AuthenticationRequiredError } from '../index.js'
import { gotScraping } from 'got-scraping';

vi.mock('got-scraping', () => {
  return {
    gotScraping: vi.fn().mockImplementation(async (options: { url: string }) => {

      const workId = options.url.split('/works/')[1].split('?')[0]

      if (workId === '35961484' || workId === '66534724' || workId === '57038482') {
        const mockHtmlPath = path.join(__dirname, '../fixtures', `work-${workId}.html`)
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
      } else if (workId === '333333') {
        return Promise.resolve({
          statusCode: 200,
          body: `
            <html>
              <body>
                <main id="main">
                  <h2 class="title heading">Work Title</h2>
                  <a rel="author">FirstAuthor</a>
                  <a rel="author">SecondAuthor</a>
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

  it('should return work details for a valid work ID', async () => {
    const workId = '35961484'

    const work: Work = await getWork(workId)

    expect(work).toBeDefined()
    expect(work.id).toBe(workId)
    expect(typeof work.title).toBe('string')
    expect(work.title).not.toBe('')
    expect(typeof work.author).toBe('string')
    expect(work.author).toBe('AmberZ10')
    expect(work.authors).toEqual(['AmberZ10'])

    expect(work.stats.updated).toBe('2021-12-27')
    expect(Array.isArray(work.tags.fandoms)).toBe(true)

    const workId2 = '66534724'
    const work2: Work = await getWork(workId2)

    expect(work.stats.comments).toBe(155)
    expect(work2.stats.comments).toBe(0)

    expect(work.stats.kudos).toBe(4916)
    expect(work2.stats.kudos).toBe(32)

    expect(work.stats.bookmarks).toBe(654)
    expect(work2.stats.bookmarks).toBe(3)
  })

  it('should throw an error for an invalid workID using mock', async() => {
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
  it('should receive multiple authors', async () => {
    const work: Work = await getWork('333333')

    expect(work.authors).toEqual(['FirstAuthor', 'SecondAuthor'])
    expect(work.author).toBe('FirstAuthor')
  })
  it('should receive an anonymous author', async () => {
    const work: Work = await getWork('57038482')

    expect(work.authors).toEqual(['Anonymous'])
    expect(work.author).toBe('Anonymous')
  })
})
