import { describe, it, expect, vi, afterEach } from 'vitest';
import { promises as fs } from 'fs'
import path from 'path'

import { getChapters } from './index'

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string}) => {
    const workId = options.url.split('/works/')[1].split('?')[0]
    let fixtureName = ''

    if(workId === '35961484') {
      fixtureName = 'work-35961484.html'
    }
    else if (workId === '66534724') {
      fixtureName = 'work-66534724.html'
    }

    if (fixtureName) {
      const mockHtmlPath = path.join(__dirname, 'fixtures', fixtureName)
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')

      return {statusCode: 200, body: mockHtml}
    } else {
      return {statusCode: 404, body: 'Not Found'}
    }
  })
}))

describe('getChapters', () => {
  it('should return a list of chapters for a valid work ID', async () => {
    const workId = '35961484'
    const chapters = await getChapters(workId)

    expect(Array.isArray(chapters)).toBe(true)
    expect(chapters.length).toBeGreaterThan(1)

    const firstChapter = chapters[0]
    expect(firstChapter).toHaveProperty('id')
    expect(firstChapter).toHaveProperty('title')
    expect(firstChapter).toHaveProperty('published')
    expect(typeof firstChapter.id).toBe('string')
    expect(typeof firstChapter.title).toBe('string')
    expect(firstChapter.published).toBe('')
  })

  it('should return an array with a single chapter for a single-chapter work', async () => {
    const workId = '66534724'
    const chapters = await getChapters(workId)

    expect(Array.isArray(chapters)).toBe(true)
    expect(chapters.length).toBe(1)

    expect(chapters[0]).toEqual({
      id: workId,
      title: 'The right tool for everything',
      published: '2025-06-13'
    })
  })

  it('should throw an error for an invalid work ID', async() => {
    const invalidWorkId = '000000'
    await expect(getChapters(invalidWorkId)).rejects.toThrow()
  })
})

