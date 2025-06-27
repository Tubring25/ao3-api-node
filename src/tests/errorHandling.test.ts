import { AO3Error } from '../types/index.js';
import { describe, it, expect, vi, afterEach } from 'vitest'
import { search, getTagWorks } from '../lib/search.js'
import { getSeries } from '../lib/series.js'
import { getUserWorks, getUserProfile } from '../lib/users.js'
import { getWork, getChapters, getChapterContent } from '../lib/work.js'

vi.mock('../lib/request.js', () => ({
  request: vi.fn()
}))

const { request } = await vi.importMock('../lib/request.js')

afterEach(() => {
  vi.clearAllMocks()
})

describe('Error Handling', () => {
  const testCases = [
    { fn: () => search({ query: 'test' }), error: new AO3Error('Search failed', 500) },
    { fn: () => getTagWorks('test-tag'), error: new AO3Error('Tag search failed', 503) },
    { fn: () => getSeries('12345'), error: new AO3Error('Series fetch failed', 403) },
    { fn: () => getUserWorks('nonexistentuser'), error: new AO3Error('User works fetch failed', 404) },
    { fn: () => getUserProfile('privateuser'), error: new AO3Error('User profile fetch failed', 403) },
    { fn: () => getWork('12345'), error: new AO3Error('Work fetch failed', 500) },
    { fn: () => getChapters('12345'), error: new AO3Error('Chapters fetch failed', 404) },
    { fn: () => getChapterContent('12345', '67890'), error: new AO3Error('Chapter content fetch failed', 403) },
  ]

  for (const { fn, error } of testCases) {
    it(`should throw AO3Error for ${fn.toString()}`, async () => {
      request.mockRejectedValue(error)
      await expect(fn()).rejects.toThrow(error)
    })
  }
})