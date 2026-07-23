import { AO3Error, ChapterNotFoundError, SeriesNotFoundError, UserNotFoundError, WorkNotFoundError } from '../types/index.js';
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
  const notFoundCases = [
    { fn: () => search({ query: 'test' }), ExpectedError: AO3Error },
    { fn: () => getTagWorks('test-tag'), ExpectedError: AO3Error },
    { fn: () => getSeries('12345'), ExpectedError: SeriesNotFoundError },
    { fn: () => getUserWorks('nonexistentuser'), ExpectedError: UserNotFoundError },
    { fn: () => getUserProfile('privateuser'), ExpectedError: UserNotFoundError },
    { fn: () => getWork('12345'), ExpectedError: WorkNotFoundError },
    { fn: () => getChapters('12345'), ExpectedError: WorkNotFoundError },
    { fn: () => getChapterContent('12345', '67890'), ExpectedError: ChapterNotFoundError },
  ]

  for (const { fn, ExpectedError } of notFoundCases) {
    it(`should throw ${ExpectedError.name} for ${fn.toString()}`, async () => {
      (request as any).mockRejectedValue(
        new AO3Error('Not found', 404)
      )
      await expect(fn()).rejects.toBeInstanceOf(ExpectedError)
    })
  }

  it('should throw original error if not 404', async () => {
    const sourceError = new AO3Error('Internal server error', 500)
    ;(request as any).mockRejectedValue(sourceError)
    await expect(getWork('12345')).rejects.toBe(sourceError)
  })
})
