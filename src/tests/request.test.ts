import { afterEach, describe, expect, it, vi } from 'vitest'
import { gotScraping } from 'got-scraping'
import { request } from '../lib/request.js'

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockResolvedValue({ statusCode: 200, body: '<html></html>' })
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('request', () => {
  it('retries transient AO3 and Cloudflare failures', async () => {
    await request('https://archiveofourown.org/works/123')

    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      retry: expect.objectContaining({
        limit: 2,
        statusCodes: expect.arrayContaining([525])
      })
    }))
  })
  it('send request with proxy, timeout and signal', async () => {
    const controller = new AbortController()
    await request('https://archiveofourown.org/works/123', {
      proxyUrl: 'https://proxy.com',
      timeoutMs: 5000,
      signal: controller.signal
    })
    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      retry: expect.objectContaining({
        limit: 2,
        statusCodes: expect.arrayContaining([525])
      }),
      proxyUrl: 'https://proxy.com',
      timeout: { request: 5000 },
      signal: controller.signal
    }))
  })
})
