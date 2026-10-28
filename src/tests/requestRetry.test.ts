import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { request } from '../lib/request.js'
import { AO3Error } from '../types/index.js'

// Exercises got-scraping's real retry handling against a local server. got only
// honours a Retry-After up to the request timeout (got-scraping's default is 60 s).
const hits = new Map<string, number>()
let server: Server
let baseUrl: string

beforeAll(async () => {
  server = createServer((req, res) => {
    const count = (hits.get(req.url!) ?? 0) + 1
    hits.set(req.url!, count)

    if (req.url === '/retry-after-too-long') {
      res.writeHead(429, { 'Retry-After': '3600' }).end('Retry later')
    } else if (req.url === '/retry-after-short-timeout') {
      res.writeHead(429, { 'Retry-After': '1' }).end('Retry later')
    } else if (req.url === '/retry-after-short' && count === 1) {
      res.writeHead(429, { 'Retry-After': '1' }).end('Retry later')
    } else {
      res.writeHead(200).end('ok')
    }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

describe('request retries', () => {
  it('fails instead of waiting when Retry-After exceeds the request timeout', async () => {
    const startedAt = Date.now()

    const error = await request(`${baseUrl}/retry-after-too-long`).catch(error => error)

    expect(error).toBeInstanceOf(AO3Error)
    expect(error.statusCode).toBe(429)
    expect(hits.get('/retry-after-too-long')).toBe(1)
    expect(Date.now() - startedAt).toBeLessThan(1000)
  })

  it('waits for a Retry-After within the request timeout and retries', async () => {
    const startedAt = Date.now()

    await expect(request(`${baseUrl}/retry-after-short`)).resolves.toBe('ok')

    expect(hits.get('/retry-after-short')).toBe(2)
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(950)
  })

  it('uses timeoutMs as the Retry-After limit', async () => {
    const error = await request(`${baseUrl}/retry-after-short-timeout`, { timeoutMs: 500 }).catch(error => error)

    expect(error).toBeInstanceOf(AO3Error)
    expect(error.statusCode).toBe(429)
    expect(hits.get('/retry-after-short-timeout')).toBe(1)
  })
})
