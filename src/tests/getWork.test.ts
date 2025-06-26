import { describe, it, expect, vi, afterAll, afterEach } from 'vitest';
import { promises as fs } from 'fs'
import path from 'path'
import { getWork, type Work } from '../index.js'
import { gotScraping } from 'got-scraping';

vi.mock('got-scraping', () => {
  return {
    gotScraping: vi.fn().mockImplementation(async (options: {url: string}) => {
      console.log(`[Mock] Intercepted request to: ${options.url}`)

      const workId = options.url.split('/works/')[1].split('?')[0]

      if(workId === '35961484') {
        const mockHtmlPath = path.join(__dirname, '../fixtures', 'work-35961484.html')
        const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')

        return Promise.resolve({
          statusCode: 200,
          body: mockHtml
        })
      } else {
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
    expect(Array.isArray(work.tags.fandoms)).toBe(true)
  })

  it.concurrent('should throw an error for an invalid workID using mock', async() => {
    const invalidWorkId = '000000'

    await expect(getWork(invalidWorkId)).rejects.toThrow(
      `Failed to fetch work ${invalidWorkId}. Status: 404`
    )
  })

  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080';
    await getWork('35961484', { proxyUrl });
    expect(gotScraping).toHaveBeenCalledWith({
      url: expect.any(String),
      proxyUrl,
    });
  });
})
