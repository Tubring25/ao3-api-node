import { describe, vi, expect, afterEach, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { getUserBookmarks, getWorkBookmarks } from "../index.js";
import { gotScraping } from "got-scraping";

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string, proxyUrl?: string}) => {
    if(options.url.includes('/users/testuser/bookmarks')) {
      const mockHtml = `
        <html>
          <head><title>testuser's Bookmarks</title></head>
          <body>
            <h2 class="heading">Bookmarks (1 of 1)</h2>
            <ol class="bookmark index group">
              <li class="bookmark" id="bookmark_12345">
                <div class="user">
                  <a href="/users/testuser">testuser</a>
                </div>
                <h4 class="heading">
                  <a href="/works/123456">Test Work Title</a>
                </h4>
                <p class="byline">
                  by <a rel="author" href="/users/testauthor">testauthor</a>
                </p>
                <blockquote class="summary">
                  <p>This is a test work summary.</p>
                </blockquote>
                <p class="datetime">01 Jan 2024</p>
                <div class="notes">
                  <blockquote>This is a bookmark note.</blockquote>
                </div>
                <ul class="tags">
                  <li><a class="tag">Test Tag</a></li>
                </ul>
                <dl class="stats">
                  <dt>Rating:</dt>
                  <dd class="rating"><span class="text">General Audiences</span></dd>
                  <dt>Words:</dt>
                  <dd class="words">1000</dd>
                  <dt>Chapters:</dt>
                  <dd class="chapters">1/1</dd>
                  <dt>Kudos:</dt>
                  <dd class="kudos">50</dd>
                  <dt>Comments:</dt>
                  <dd class="comments">10</dd>
                  <dt>Bookmarks:</dt>
                  <dd class="bookmarks">5</dd>
                  <dt>Hits:</dt>
                  <dd class="hits">200</dd>
                </dl>
              </li>
            </ol>
          </body>
        </html>
      `
      return { statusCode: 200, body: mockHtml }
    }
    else if(options.url.includes('/works/123456/bookmarks')) {
      const mockHtml = `
        <html>
          <head><title>Bookmarks for Test Work</title></head>
          <body>
            <h2 class="heading">Public Bookmarks (1 of 1)</h2>
            <ol class="bookmark index group">
              <li class="bookmark" id="bookmark_67890">
                <div class="user">
                  <a href="/users/bookmarkuser">bookmarkuser</a>
                </div>
                <h4 class="heading">
                  <a href="/works/123456">Test Work Title</a>
                </h4>
                <p class="byline">
                  by <a rel="author" href="/users/testauthor">testauthor</a>
                </p>
                <p class="datetime">15 Jan 2024</p>
                <div class="rec">★</div>
              </li>
            </ol>
          </body>
        </html>
      `
      return { statusCode: 200, body: mockHtml }
    }
    return { statusCode: 404, statusMessage: 'Not Found' }
  })
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('getUserBookmarks', () => {
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
    expect(bookmark.bookmark).toHaveProperty('workAuthor', 'testauthor')
    expect(bookmark.bookmark).toHaveProperty('username', 'testuser')
    expect(bookmark.bookmark).toHaveProperty('notes', 'This is a bookmark note.')
    expect(bookmark.bookmark).toHaveProperty('tags')
    expect(bookmark.bookmark.tags).toContain('Test Tag')
    
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
    await expect(getUserBookmarks('nonexistentuser')).rejects.toThrow()
  })
})

describe('getWorkBookmarks', () => {
  it('should return work bookmarks with correct structure', async () => {
    const result = await getWorkBookmarks('123456')
    
    expect(result).toHaveProperty('bookmarks')
    expect(result.bookmarks).toHaveLength(1)
    
    const bookmark = result.bookmarks[0]
    expect(bookmark.bookmark).toHaveProperty('id', '67890')
    expect(bookmark.bookmark).toHaveProperty('workId', '123456')
    expect(bookmark.bookmark).toHaveProperty('username', 'bookmarkuser')
    expect(bookmark.bookmark).toHaveProperty('rec', true)
  })

  it('should throw error for non-existent work', async () => {
    await expect(getWorkBookmarks('999999')).rejects.toThrow()
  })
})