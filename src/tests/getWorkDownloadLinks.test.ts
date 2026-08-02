import { promises as fs } from 'fs'
import path from 'path'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { gotScraping } from 'got-scraping'

import {
  AO3Error,
  AuthenticationRequiredError,
  getWorkDownloadLinks,
  WorkNotFoundError
} from '../index.js'

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: { url: string }) => {
    const workId = options.url.split('/works/')[1].split('?')[0]

    if (workId === '35961484') {
      const fixturePath = path.join(__dirname, '../fixtures', 'work-35961484.html')
      const body = await fs.readFile(fixturePath, 'utf-8')
      return { statusCode: 200, body }
    }

    if (workId === '111111') {
      return {
        statusCode: 200,
        body: '<html><body><h2 class="title heading">Work without downloads</h2></body></html>'
      }
    }

    if (workId === '222222') {
      return {
        statusCode: 200,
        body: `
          <html>
            <body>
              <div id="loginform">
                <form id="new_user"></form>
              </div>
            </body>
          </html>
        `
      }
    }

    if (workId === '333333') {
      return { statusCode: 200, body: '<html><body></body></html>' }
    }

    if (workId === '444444') {
      return {
        statusCode: 200,
        body: `
          <html>
            <body>
              <h2 class="title heading">Work with unsupported downloads</h2>
              <li class="download">
                <a>Missing href</a>
                <a href="/downloads/444444/work.txt?updated_at=123">TXT</a>
              </li>
            </body>
          </html>
        `
      }
    }

    return { statusCode: 404, body: 'Not Found' }
  })
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('getWorkDownloadLinks', () => {
  it('should return all supported download formats', async () => {
    const links = await getWorkDownloadLinks('35961484')

    expect(links.map(link => link.format)).toEqual([
      'AZW3',
      'EPUB',
      'MOBI',
      'PDF',
      'HTML'
    ])
  })

  it('should return an absolute EPUB URL', async () => {
    const links = await getWorkDownloadLinks('35961484')
    const epub = links.find(link => link.format === 'EPUB')

    expect(epub?.url).toBe(
      'https://archiveofourown.org/downloads/35961484/Thank_God_You_Introduced.epub?updated_at=1680576065'
    )
  })

  it('should preserve the updated_at query parameter', async () => {
    const links = await getWorkDownloadLinks('35961484')
    const epub = links.find(link => link.format === 'EPUB')

    expect(new URL(epub!.url).searchParams.get('updated_at')).toBe('1680576065')
  })

  it('should return an empty array when a valid work has no download links', async () => {
    await expect(getWorkDownloadLinks('111111')).resolves.toEqual([])
  })

  it('should throw WorkNotFoundError for a missing work', async () => {
    await expect(getWorkDownloadLinks('000000')).rejects.toBeInstanceOf(WorkNotFoundError)
  })

  it('should throw AuthenticationRequiredError for a restricted work', async () => {
    await expect(getWorkDownloadLinks('222222')).rejects.toBeInstanceOf(AuthenticationRequiredError)
  })

  it('should throw AO3Error for an invalid work page', async () => {
    await expect(getWorkDownloadLinks('333333')).rejects.toBeInstanceOf(AO3Error)
  })

  it('should ignore unsupported formats and links without href', async () => {
    await expect(getWorkDownloadLinks('444444')).resolves.toEqual([])
  })

  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080'

    await getWorkDownloadLinks('35961484', { proxyUrl })

    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.any(String),
      proxyUrl
    }))
  })
})
