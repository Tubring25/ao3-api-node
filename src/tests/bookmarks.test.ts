import { describe, vi, expect, afterEach, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { getUserBookmarks, getWorkBookmarks } from "../index.js";
import { gotScraping } from "got-scraping";
import { parseBookmarkList, parseWorkBookmarkList } from "../lib/parsers.js";
import { UserNotFoundError, WorkNotFoundError } from "../types/index.js";

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string, proxyUrl?: string}) => {
    if(options.url.includes('/users/testuser/bookmarks')) {
      const mockHtml = await fs.readFile(path.join(__dirname, '../fixtures/user-testuser-bookmarks.html'), 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    else if(options.url.includes('/users/TheHomelyBadger/bookmarks')) {
      const mockHtml = await fs.readFile(path.join(__dirname, '../fixtures/user-TheHomelyBadger-bookmarks.html'), 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    else if(options.url.includes('/works/35961484/bookmarks')) {
      const mockHtml = await fs.readFile(path.join(__dirname, '../fixtures/work-35961484-bookmarks.html'), 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    else if(options.url.includes('/works/123456/bookmarks')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'work-bookmarks-current.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    return { statusCode: 404, statusMessage: 'Not Found' }
  })
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('getUserBookmarks', () => {
  it('should parse a saved AO3 user bookmarks page', async () => {
    const result = await getUserBookmarks('TheHomelyBadger')

    expect(result).toEqual(expect.objectContaining({ total: 53, page: 1, totalPages: 3 }))
    expect(result.bookmarks).toHaveLength(20)

    const [first] = result.bookmarks
    expect(first.bookmark).toEqual({
      id: '3229677926',
      workId: '87629446',
      workTitle: 'supersonic (all eyes on us)',
      workAuthor: 'wolf_dyke',
      userId: 'TheHomelyBadger',
      username: 'TheHomelyBadger',
      created: '24 Oct 2026',
      notes: null,
      tags: [],
      public: true,
      rec: false
    })
    expect(first.work).toEqual(expect.objectContaining({
      id: '87629446',
      title: 'supersonic (all eyes on us)',
      authors: ['wolf_dyke'],
      language: 'English',
      words: 96725,
      chapters: { posted: 7, total: 20 },
      complete: false,
      kudos: 146,
      comments: 113,
      bookmarks: 56,
      hits: 5076
    }))
    expect(first.work.tags).toEqual(expect.objectContaining({
      rating: 'Explicit',
      warnings: ['No Archive Warnings Apply'],
      category: ['F/F'],
      fandoms: ['Arcane: League of Legends (Cartoon 2021)', 'League of Legends (Video Game)'],
      relationships: ['Caitlyn/Vi (League of Legends)']
    }))
    expect(first.work.tags.freeforms).toContain('somewhat slow burn')
    expect(first.work.summary).toContain('<p>“I told you not to call me Cait.”</p>')
    expect(first.work.date).not.toBe(first.bookmark.created)
  })

  it('should leave the work ID empty for a bookmarked series', async () => {
    const result = await getUserBookmarks('TheHomelyBadger')
    const series = result.bookmarks.find(({ bookmark }) => bookmark.id === '1893835204')

    expect(series?.bookmark.workId).toBe('')
    expect(series?.work.id).toBe('')
    expect(series?.work.title).toBe('Homecoming AU')
  })

  it('should return user bookmarks with correct structure', async () => {
    const result = await getUserBookmarks('testuser')

    expect(result).toHaveProperty('bookmarks')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('page')
    expect(result).toHaveProperty('totalPages')

    expect(result.bookmarks).toHaveLength(1)
    expect(result.total).toBe(1)

    const bookmark = result.bookmarks[0]
    expect(bookmark.bookmark).toHaveProperty('id', '12345')
    expect(bookmark.bookmark).toHaveProperty('workId', '123456')
    expect(bookmark.bookmark).toHaveProperty('workTitle', 'Test Work Title')
    expect(bookmark.bookmark.workAuthor).toBe('testauthor')
    expect(bookmark.work.author).toBe('testauthor')
    expect(bookmark.work.authors).toEqual(['testauthor', 'coauthor'])
    expect(bookmark.bookmark).toHaveProperty('username', 'testuser')
    expect(bookmark.bookmark).toHaveProperty('notes', 'This is a bookmark note.')
    expect(bookmark.bookmark).toHaveProperty('tags')
    expect(bookmark.bookmark.tags).toEqual(['Test Tag'])
    expect(bookmark.bookmark.created).toBe('01 Jan 2024')
    expect(bookmark.bookmark.userId).toBe('testuser')

    expect(bookmark.work).toHaveProperty('title', 'Test Work Title')
    expect(bookmark.work).toHaveProperty('author', 'testauthor')
    expect(bookmark.work).toHaveProperty('words', 1000)
    expect(bookmark.work).toHaveProperty('kudos', 50)
  })

  it('should handle pagination correctly', async () => {
    const result = await getUserBookmarks('testuser', 1)

    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(1)
  })

  it('should throw error for non-existent user', async () => {
    await expect(getUserBookmarks('nonexistentuser')).rejects.toBeInstanceOf(UserNotFoundError)
  })
})

describe('getWorkBookmarks', () => {
  it('should parse a saved AO3 work bookmarks page', async () => {
    const result = await getWorkBookmarks('35961484')

    expect(result).toEqual(expect.objectContaining({ total: 686, page: 1, totalPages: 35 }))
    expect(result.bookmarks).toHaveLength(20)
    expect(result.bookmarks[0].bookmark).toEqual({
      id: null,
      workId: '35961484',
      workTitle: 'Thank God You Introduced Me to Your Sister',
      workAuthor: 'AmberZ10',
      userId: 'GettingTired',
      username: 'GettingTired',
      created: '09 Sep 2026',
      notes: null,
      tags: [],
      public: true,
      rec: false
    })
    expect(result.bookmarks[0].work).toEqual(expect.objectContaining({
      id: '35961484',
      date: '26 Dec 2021',
      words: 6095,
      chapters: { posted: 2, total: 2 },
      complete: true,
      kudos: 5261,
      bookmarks: 686,
      hits: 63529
    }))
    expect(result.bookmarks[0].work.tags.relationships).toEqual([
      'Caitlyn/Vi (League of Legends)',
      'Ekko/Jinx (League of Legends)'
    ])
  })

  it('should read bookmark notes from a saved AO3 work bookmarks page', async () => {
    const result = await getWorkBookmarks('35961484')
    const notesByUser = new Map(result.bookmarks.map(({ bookmark }) => [bookmark.username, bookmark.notes]))

    expect(notesByUser.get('Ruby_red_fangirl')).toBe('Thank God you introduced me to your sister - Sarah barrios')
    expect(notesByUser.get('Blackwings05')).toContain('Can we not?')
    expect(notesByUser.get('morbu13')).toBeNull()
  })

  it('should return work bookmarks with correct structure', async () => {
    const result = await getWorkBookmarks('123456')

    expect(result).toHaveProperty('bookmarks')
    expect(result.bookmarks).toHaveLength(1)
    expect(result.total).toBe(687)
    expect(result.totalPages).toBe(35)

    const bookmark = result.bookmarks[0]
    expect(bookmark.bookmark).toHaveProperty('id', null)
    expect(bookmark.bookmark).toHaveProperty('workId', '123456')
    expect(bookmark.bookmark).toHaveProperty('username', 'bookmarkuser')
    expect(bookmark.bookmark).toHaveProperty('rec', true)
    expect(bookmark.bookmark).toHaveProperty('notes', 'Bookmark note.')
    expect(bookmark.work).toHaveProperty('title', 'Test Work Title')
    expect(bookmark.work).toHaveProperty('words', 1000)
    expect(bookmark.work.authors).toEqual(['testauthor'])
  })

  it('should throw error for non-existent work', async () => {
    await expect(getWorkBookmarks('999999')).rejects.toBeInstanceOf(WorkNotFoundError)
  })

  it('should send request with timeout and signal', async () => {
    const controller = new AbortController()
    const proxyUrl = 'http://localhost:8080'
    const request = await getWorkBookmarks('123456', 1, {
      proxyUrl,
      timeoutMs: 5000,
      signal: controller.signal,
    })
    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      timeout: { request: 5000 },
      signal: controller.signal,
      proxyUrl,
    }))
  })
})

describe('bookmark totals', () => {
  it.each([
    ['1 Bookmark', 1],
    ['0 Bookmarks', 0],
    ['1 - 20 of 1,234 Bookmarks', 1234]
  ])('parses %s', (heading, expectedTotal) => {
    const html = `<h2 class="heading">${heading}</h2><ol class="bookmark"></ol>`

    expect(parseBookmarkList(html).total).toBe(expectedTotal)
    expect(parseWorkBookmarkList(html).total).toBe(expectedTotal)
  })
})
