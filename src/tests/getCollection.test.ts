import { afterEach, describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { gotScraping } from 'got-scraping'

import {
  AO3Error,
  CollectionNotFoundError,
  getCollection,
  getCollectionWorks
} from '../index.js'

vi.mock('got-scraping', () => {
  const createCollectionWorksPage = (
    collectionName: string,
    page: number,
    totalPages: number,
    totalResults: number,
    works: Array<{ id: string, title: string }>
  ) => `
    <div id="dashboard" class="region">
      <a href="/collections/${collectionName}">Dashboard</a>
    </div>
    <div id="main" class="works-index dashboard filtered region">
      <h2 class="heading">
        ${totalResults === 0
          ? `0 Works in ${collectionName}`
          : `${(page - 1) * works.length + 1} - ${Math.min(page * works.length, totalResults)} of ${totalResults} Works in ${collectionName}`}
      </h2>
      ${totalPages > 1 ? `
        <ol class="pagination actions">
          ${Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1
            return pageNumber === page
              ? `<li><span class="current">${pageNumber}</span></li>`
              : `<li><a href="?page=${pageNumber}">${pageNumber}</a></li>`
          }).join('')}
        </ol>
      ` : ''}
      <ol class="work index group">
        ${works.map(work => `
          <li id="work_${work.id}" class="work blurb group">
            <h4 class="heading"><a href="/works/${work.id}">${work.title}</a></h4>
            <h5 class="fandoms heading"><a href="/tags/Test%20Fandom/works">Test Fandom</a></h5>
            <p class="byline"><a rel="author" href="/users/testauthor">testauthor</a></p>
            <blockquote class="userstuff summary"><p>Summary for ${work.title}.</p></blockquote>
            <p class="datetime">01 Jan 2026</p>
            <dl class="stats">
              <dd class="language">English</dd>
              <dd class="words">1,000</dd>
              <dd class="chapters">1/1</dd>
              <dd class="comments">2</dd>
              <dd class="kudos">3</dd>
              <dd class="bookmarks">4</dd>
              <dd class="hits">5</dd>
            </dl>
          </li>
        `).join('')}
      </ol>
    </div>
  `

  return {
    gotScraping: vi.fn().mockImplementation(async (options: { url: string }) => {
    const url = new URL(options.url)
    const pathname = url.pathname

    if (pathname === '/collections/test_collection/works') {
      const page = Number(url.searchParams.get('page') || '1')
      const works = page === 2
        ? [{ id: '102', title: 'Second Collection Work' }]
        : [{ id: '101', title: 'First Collection Work' }]

      return {
        statusCode: 200,
        body: createCollectionWorksPage('test_collection', page, 2, 2, works)
      }
    }

    if (pathname === '/collections/empty_collection/works') {
      return {
        statusCode: 200,
        body: createCollectionWorksPage('empty_collection', 1, 1, 0, [])
      }
    }

    if (pathname === '/collections/fallback_collection/works') {
      return {
        statusCode: 200,
        body: `
          <div id="main" class="works-index region">
            <h2 class="heading">20 Works</h2>
            <ol class="work index group"></ol>
          </div>
        `
      }
    }

    if (pathname === '/collections/invalid_collection/works') {
      return { statusCode: 200, body: '<html><body>Invalid page</body></html>' }
    }

    if (pathname === '/collections/test_collection') {
      const fixturePath = path.join(__dirname, '../fixtures', 'collection-test_collection.html')
      const body = await fs.readFile(fixturePath, 'utf-8')
      return { statusCode: 200, body }
    }

    if (pathname === '/collections/empty_collection') {
      return {
        statusCode: 200,
        body: `
          <div id="dashboard" class="region"></div>
          <div id="main" class="collections-show dashboard region">
            <div id="collection-page" class="collection home">
              <div class="primary header module">
                <h2 class="heading">Empty Collection</h2>
                <p class="type">(Open, Unmoderated, Prompt Meme Challenge)</p>
              </div>
            </div>
          </div>
        `
      }
    }

    if (pathname === '/collections/invalid_collection') {
      return { statusCode: 200, body: '<html><body>Invalid page</body></html>' }
    }

    return { statusCode: 404, statusMessage: 'Not Found' }
    })
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getCollection', () => {
  it('should return core collection information', async () => {
    const collection = await getCollection('test_collection')

    expect(collection).toEqual({
      name: 'test_collection',
      title: 'Test Collection',
      descriptionHtml: '<p>A <strong>test</strong> collection.</p>',
      closed: true,
      moderated: true,
      unrevealed: true,
      anonymous: true,
      challengeType: 'GiftExchange',
      workCount: 1234,
      bookmarkCount: 56
    })
  })

  it('should return defaults for optional collection information', async () => {
    const collection = await getCollection('empty_collection')

    expect(collection.descriptionHtml).toBeNull()
    expect(collection.closed).toBe(false)
    expect(collection.moderated).toBe(false)
    expect(collection.unrevealed).toBe(false)
    expect(collection.anonymous).toBe(false)
    expect(collection.challengeType).toBe('PromptMeme')
    expect(collection.workCount).toBe(0)
    expect(collection.bookmarkCount).toBe(0)
  })

  it('should pass request options to the request client', async () => {
    const controller = new AbortController()
    const proxyUrl = 'http://localhost:8080'

    await getCollection('test_collection', {
      proxyUrl,
      timeoutMs: 5000,
      signal: controller.signal
    })

    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://archiveofourown.org/collections/test_collection',
      proxyUrl,
      timeout: { request: 5000 },
      signal: controller.signal
    }))
  })

  it('should throw CollectionNotFoundError for a missing collection', async () => {
    await expect(getCollection('missing_collection')).rejects.toBeInstanceOf(CollectionNotFoundError)
  })

  it('should throw AO3Error for an invalid collection page', async () => {
    await expect(getCollection('invalid_collection')).rejects.toBeInstanceOf(AO3Error)
  })
})

describe('getCollectionWorks', () => {
  it('should return works for a collection', async () => {
    const searchResultsPage1 = await getCollectionWorks('test_collection')
    const searchResultsPage2 = await getCollectionWorks('test_collection', 2)

    expect(searchResultsPage1.totalPages).toBe(2)
    expect(searchResultsPage1.totalResults).toBe(2)
    expect(searchResultsPage1.works[0].id).toBe("101")
    expect(searchResultsPage2.works[0].id).toBe("102")
  })

  it('should return empty collection', async () => {
    const searchResult = await getCollectionWorks('empty_collection')

    expect(searchResult.totalPages).toBe(1)
    expect(searchResult.totalResults).toBe(0)
    expect(searchResult.works).toHaveLength(0)
  })

  it('should pass request options to the request client', async () => {
    const controller = new AbortController()
    const proxyUrl = 'http://localhost:8080'

    await getCollectionWorks('test_collection', 1, {
      proxyUrl,
      timeoutMs: 5000,
      signal: controller.signal
    })

    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://archiveofourown.org/collections/test_collection/works?page=1',
      proxyUrl,
      timeout: { request: 5000 },
      signal: controller.signal
    }))
  })

  it('fallback collection check', async () => {
    await expect(getCollectionWorks('fallback_collection')).rejects.toBeInstanceOf(CollectionNotFoundError)
  })

  it('should throw AO3Error for an invalid collection', async () => {
    await expect(getCollectionWorks('invalid_collection')).rejects.toBeInstanceOf(AO3Error)
  })

  it('should throw CollectionNotFoundError for a missing collection', async () => {
    await expect(getCollectionWorks('missing_collection')).rejects.toBeInstanceOf(CollectionNotFoundError)
  })
})
