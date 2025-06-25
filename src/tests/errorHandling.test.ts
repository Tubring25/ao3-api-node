import { describe, it, expect, vi, afterEach } from 'vitest'
import { search, getTagWorks } from '../lib/search.js'
import { getSeries } from '../lib/series.js'
import { getUserWorks, getUserProfile } from '../lib/users.js'
import { getWork, getChapters, getChapterContent } from '../lib/work.js'

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn()
}))

const { gotScraping } = await vi.importMock('got-scraping')

afterEach(() => {
  vi.clearAllMocks()
})

describe('Error Handling', () => {
  describe('search function', () => {
    it('should throw error when search request fails', async () => {
      gotScraping.mockResolvedValue({
        statusCode: 500,
        body: 'Internal Server Error'
      })

      await expect(search({ query: 'test' })).rejects.toThrow(
        'Failed to search for works. Status: 500'
      )
    })

    it('should throw error when search returns 404', async () => {
      gotScraping.mockResolvedValue({
        statusCode: 404,
        body: 'Not Found'
      })

      await expect(search({ query: 'test' })).rejects.toThrow(
        'Failed to search for works. Status: 404'
      )
    })
  })

  describe('getTagWorks function', () => {
    it('should throw error when tag works request fails', async () => {
      gotScraping.mockResolvedValue({
        statusCode: 503,
        body: 'Service Unavailable'
      })

      await expect(getTagWorks('test-tag')).rejects.toThrow(
        'Failed to search for works. Status: 503'
      )
    })
  })

  describe('getSeries function', () => {
    it('should throw error when series request fails', async () => {
      gotScraping.mockResolvedValue({
        statusCode: 403,
        body: 'Forbidden'
      })

      await expect(getSeries('12345')).rejects.toThrow(
        'Failed to fetch series 12345. Status: 403'
      )
    })
  })

  describe('getUserWorks function', () => {
    it('should throw error when user works request fails', async () => {
      gotScraping.mockResolvedValue({
        statusCode: 404,
        body: 'Not Found'
      })

      await expect(getUserWorks('nonexistentuser')).rejects.toThrow(
        'Failed to fetch user works for nonexistentuser. Status: 404'
      )
    })
  })

  describe('getUserProfile function', () => {
    it('should throw error when user profile request fails', async () => {
      gotScraping.mockResolvedValue({
        statusCode: 403,
        body: 'Forbidden'
      })

      await expect(getUserProfile('privateuser')).rejects.toThrow(
        'Failed to fetch user profile for privateuser. Status: 403'
      )
    })
  })

  describe('getWork function', () => {
    it('should throw error when work request fails', async () => {
      gotScraping.mockResolvedValue({
        statusCode: 500,
        body: 'Internal Server Error'
      })

      await expect(getWork('12345')).rejects.toThrow(
        'Failed to fetch work 12345. Status: 500'
      )
    })
  })

  describe('getChapters function', () => {
    it('should throw error when chapters request fails', async () => {
      gotScraping.mockResolvedValue({
        statusCode: 404,
        body: 'Not Found'
      })

      await expect(getChapters('12345')).rejects.toThrow(
        'Failed to fetch chapters for work 12345. Status: 404'
      )
    })
  })

  describe('getChapterContent function', () => {
    it('should throw error when chapter content request fails', async () => {
      gotScraping.mockResolvedValue({
        statusCode: 403,
        body: 'Forbidden'
      })

      await expect(getChapterContent('12345', '67890')).rejects.toThrow(
        'Failed to fetch chapter 67890 for work 12345. Status: 403'
      )
    })
  })
}) 