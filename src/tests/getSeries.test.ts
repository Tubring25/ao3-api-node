import { describe, vi, expect, afterEach, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { AO3Error, getSeries, SeriesNotFoundError } from "../index.js";
import { gotScraping } from "got-scraping";

vi.mock('got-scraping', () => {
  const createSeriesPage = (
    page: number,
    totalPages: number,
    works: Array<{ id: string, title: string }>
  ) => `
    <div id="main" class="series-show region">
      <h2 class="heading">Paginated Series</h2>
      <dl class="series meta">
        <dt>Creator:</dt>
        <dd><a href="/users/testauthor">testauthor</a></dd>
        <dt>Words:</dt>
        <dd>3,000</dd>
        <dt>Works:</dt>
        <dd>3</dd>
        <dt>Complete?</dt>
        <dd>Yes</dd>
        <dt>Bookmarks:</dt>
        <dd>5</dd>
      </dl>
      <ol class="pagination actions">
        ${Array.from({ length: totalPages }, (_, index) => {
          const pageNumber = index + 1
          return pageNumber === page
            ? `<li><span class="current">${pageNumber}</span></li>`
            : `<li><a href="?page=${pageNumber}">${pageNumber}</a></li>`
        }).join('')}
      </ol>
      <ul class="series work index group">
        ${works.map(work => `
          <li id="work_${work.id}" class="work blurb group">
            <h4 class="heading"><a href="/works/${work.id}">${work.title}</a></h4>
            <p class="byline"><a rel="author" href="/users/testauthor">testauthor</a></p>
            <dl class="stats"><dd class="chapters">1/1</dd></dl>
          </li>
        `).join('')}
      </ul>
    </div>
  `

  return {
    gotScraping: vi.fn().mockImplementation(async (options: {url: string, proxyUrl?: string}) => {
    if (options.url.includes('/series/4001494')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'series-4001494.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    if (options.url.includes('/series/222222')) {
      const page = new URL(options.url).searchParams.get('page') || '1'
      const body = page === '1'
        ? createSeriesPage(1, 2, [
            { id: '101', title: 'First Work' },
            { id: '102', title: 'Second Work' }
          ])
        : createSeriesPage(2, 2, [
            { id: '103', title: 'Third Work' }
          ])
      return { statusCode: 200, body }
    }
    if (options.url.includes('/series/333333')) {
      const page = new URL(options.url).searchParams.get('page') || '1'
      return page === '1'
        ? { statusCode: 200, body: createSeriesPage(1, 2, [{ id: '201', title: 'First Work' }]) }
        : { statusCode: 200, body: '<html><body>Invalid page</body></html>' }
    }
    if (options.url.includes('/series/111111')) {
      return { statusCode: 200, body: '<html><body></body></html>' }
    }
    return { statusCode: 404, statusMessage: 'Not Found' }
    })
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getSeries', () => {
  it('should return details for a valid series ID', async () => {
    const seriesId = '4001494'
    const series = await getSeries(seriesId)

    expect(series).toBeDefined()
    expect(series.id).toBe('4001494')
    expect(series.title).toBe('if I was with you I could say amen.')
    expect(series.authors).toEqual(['TheHomelyBadger'])
    expect(Array.isArray(series.works)).toBe(true)
    expect(series.works.length).toBe(3)
    expect(gotScraping).toHaveBeenCalledTimes(1)
  })

  it('should fetch and merge every series page in order', async () => {
    const controller = new AbortController()
    const requestOptions = {
      proxyUrl: 'http://localhost:8080',
      timeoutMs: 5000,
      signal: controller.signal
    }

    const series = await getSeries('222222', requestOptions)

    expect(series.works.map(work => work.id)).toEqual(['101', '102', '103'])
    expect(series.works.map(work => work.title)).toEqual(['First Work', 'Second Work', 'Third Work'])
    expect(gotScraping).toHaveBeenCalledTimes(2)

    const calls = vi.mocked(gotScraping).mock.calls.map(([options]) => options)
    expect(calls.map(options => (options as { url: string }).url)).toEqual([
      'https://archiveofourown.org/series/222222',
      'https://archiveofourown.org/series/222222?page=2'
    ])
    for (const options of calls) {
      expect(options).toEqual(expect.objectContaining({
        proxyUrl: requestOptions.proxyUrl,
        timeout: { request: requestOptions.timeoutMs },
        signal: requestOptions.signal
      }))
    }
  })

  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080';
    await getSeries('4001494', { proxyUrl });
    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.any(String),
      proxyUrl,
    }));
  });

  it('should throw AO3Error for an invalid series page', async () => {
    await expect(getSeries('111111')).rejects.toBeInstanceOf(AO3Error)
  })

  it('should throw AO3Error for an invalid later series page', async () => {
    await expect(getSeries('333333')).rejects.toBeInstanceOf(AO3Error)
    expect(gotScraping).toHaveBeenCalledTimes(2)
  })

  it('should throw SeriesNotFoundError for a missing series', async () => {
    await expect(getSeries('999999')).rejects.toBeInstanceOf(SeriesNotFoundError)
  })
})
