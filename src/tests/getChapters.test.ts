import { describe, it, expect, vi, afterEach } from 'vitest';
import { promises as fs } from 'fs'
import path from 'path'

import { getChapters } from '../index.js'

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string}) => {
    const workId = options.url.split('/works/')[1].split('?')[0]
    let fixtureName = ''

    if(workId === '35961484') {
      fixtureName = 'work-35961484.html'
    }
    else if (workId === '57038482') {
      fixtureName = 'work-57038482.html'
    }

    if (fixtureName) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', fixtureName)
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

    console.log(chapters)

    expect(Array.isArray(chapters)).toBe(true)
    expect(chapters.length).toBeGreaterThan(1)

    const firstChapter = chapters[0]
    expect(firstChapter).toHaveProperty('id')
    expect(firstChapter).toHaveProperty('title')
    expect(typeof firstChapter.id).toBe('string')
    expect(typeof firstChapter.title).toBe('string')
  })

  it('should return an array with a single chapter for a single-chapter work', async () => {
    const workId = '57038482'
    const chapters = await getChapters(workId)

    console.log(chapters)

    expect(Array.isArray(chapters)).toBe(true)
    expect(chapters.length).toBe(1)

    expect(chapters[0]).toEqual({
      id: workId,
      title: 'Lleno de zafiros'
    })
  })

  it('should throw an error for an invalid work ID', async() => {
    const invalidWorkId = '000000'
    await expect(getChapters(invalidWorkId)).rejects.toThrow()
  })
})

