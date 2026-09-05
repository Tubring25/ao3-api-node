import { readFile } from 'node:fs/promises'
import { load } from 'cheerio'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AO3Error,
  AuthenticationRequiredError,
  getChapterComments,
  getChapterContent,
  getChapters,
  getSeries,
  getUserBookmarks,
  getUserProfile,
  getWorkComments,
  search
} from '../index.js'
import { request } from '../lib/request.js'

vi.mock('../lib/request.js', () => ({ request: vi.fn() }))

const fixture = (name: string) => readFile(new URL(`../fixtures/${name}.html`, import.meta.url), 'utf8')
const respond = (html: string) => vi.mocked(request).mockResolvedValue(html)

afterEach(() => vi.resetAllMocks())

describe('standalone chapter content', () => {
  it('reads the chapter returned by getChapters, including work notes and summary', async () => {
    const html = await fixture('work-57038482')
    respond(html)
    const options = { timeoutMs: 1000 }
    const [chapter] = await getChapters('57038482', options)
    const result = await getChapterContent('57038482', chapter.id, options)
    const $ = load(html)

    expect(result.chapterId).toBe(chapter.id)
    expect(result.title).toBe('Lleno de zafiros')
    expect(result.content).toContain('<strong>Part I</strong>')
    expect(result.summary).toBe($('#workskin > .preface .summary blockquote.userstuff').html())
    expect(result.notes).toContain('if you feel like')
    expect(result.endNotes).toBeTruthy()
    expect(result.endNotes).toBe($('#work_endnotes blockquote.userstuff').html())
    expect(request).toHaveBeenLastCalledWith(
      'https://archiveofourown.org/works/57038482?view_adult=true', options
    )
  })

  it('allows a standalone work without optional metadata', async () => {
    respond('<div id="workskin"><h2 class="title heading">Title</h2><div id="chapters"><div class="userstuff"><p>Body</p></div></div></div>')
    const result = await getChapterContent('1', '1')
    expect(result).toMatchObject({ title: 'Title', content: '<p>Body</p>', summary: null, notes: null, endNotes: null })
  })

  it('uses the chapter route when work and chapter IDs coincide for a chaptered work', async () => {
    vi.mocked(request)
      .mockResolvedValueOnce(await fixture('work-35961484'))
      .mockResolvedValueOnce(await fixture('chapter-89729749'))
    const result = await getChapterContent('35961484', '35961484')
    expect(result.title).toBe('Chapter 2')
    expect(request).toHaveBeenLastCalledWith(
      'https://archiveofourown.org/works/35961484/chapters/35961484?view_adult=true', undefined
    )
  })
})

describe('series metadata', () => {
  it('reads completion from the existing series fixture', async () => {
    respond(await fixture('series-4001494'))
    const result = await getSeries('4001494')
    expect(result.stats.complete).toBe(true)
    expect(result.description).toBeNull()
    expect(result.notes).toBeNull()
  })

  it('reads multiple creators, description and notes from definition-list markup', async () => {
    const $ = load(await fixture('series-4001494'))
    const creator = $('dl.series.meta > dt').filter((_, el) => $(el).text().trim() === 'Creator:')
    creator.text('Creators:').next('dd').append('<a rel="author" href="/users/coauthor">Coauthor</a>')
    $('dl.series.meta').prepend('<dt>Description:</dt><dd><blockquote class="userstuff"><p>Description</p></blockquote></dd><dt>Notes:</dt><dd><blockquote class="userstuff"><p>Notes</p></blockquote></dd>')
    $('dl.series.meta dt').filter((_, el) => $(el).text().trim() === 'Complete:').next('dd').text('No')
    respond($.html())
    const result = await getSeries('4001494')
    expect(result.authors).toEqual(['TheHomelyBadger', 'Coauthor'])
    expect(result.description).toBe('<p>Description</p>')
    expect(result.notes).toBe('<p>Notes</p>')
    expect(result.stats.complete).toBe(false)
  })
})

describe('page validation', () => {
  it.each([
    ['search', () => search({ query: 'test' })],
    ['profile', () => getUserProfile('testuser')],
    ['series', () => getSeries('1')],
    ['bookmarks', () => getUserBookmarks('testuser')],
    ['work comments', () => getWorkComments('1')],
    ['chapter comments', () => getChapterComments('1', '2')]
  ])('rejects a maintenance page for %s', async (_, fetchPage) => {
    respond('<html><h1>Temporarily unavailable</h1></html>')
    await expect(fetchPage()).rejects.toBeInstanceOf(AO3Error)
  })

  it.each([
    ['work', () => getWorkComments('1')],
    ['chapter', () => getChapterComments('1', '2')]
  ])('rejects the login page for %s comments', async (_, fetchPage) => {
    respond('<div id="loginform"><form id="new_user"></form></div>')
    await expect(fetchPage()).rejects.toBeInstanceOf(AuthenticationRequiredError)
  })

  it.each([
    ['work', () => getWorkComments('1')],
    ['chapter', () => getChapterComments('1', '2')]
  ])('requests adult content and accepts an empty %s comment section', async (_, fetchPage) => {
    respond('<div id="comments" class="comment index group"></div>')
    const result = await fetchPage()
    expect(result).toEqual({ comments: [], total: 0, page: 1, totalPages: 1 })
    const [url] = vi.mocked(request).mock.calls[0]
    expect(new URL(url).searchParams.get('view_adult')).toBe('true')
  })
})
