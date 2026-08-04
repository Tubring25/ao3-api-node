import { afterEach, describe, expect, it, vi } from 'vitest'
import { gotScraping } from 'got-scraping'

import {
  AO3Error,
  getTag,
  TagNotFoundError
} from '../index.js'

vi.mock('got-scraping', () => {
  const createTagPage = ({
    name,
    category,
    canonical = false,
    adult = false,
    synonymOf,
    withRelationships = false,
    childrenTruncated = false
  }: {
    name: string
    category: string
    canonical?: boolean
    adult?: boolean
    synonymOf?: string
    withRelationships?: boolean
    childrenTruncated?: boolean
  }) => `
    <div id="main" class="tags-show region">
      <div class="tag home profile">
        <div class="primary header module">
          <h2 class="heading">${name}</h2>
        </div>
        <p>
          This tag belongs to the ${category} Category.
          ${canonical ? `
            <a href="/faq/glossary?language_id=en#canonicaldef">canonical tag</a>
          ` : ''}
        </p>
        ${adult ? '<p class="warning">This tag indicates adult content.</p>' : ''}
        ${synonymOf ? `
          <div class="merger module">
            <h3 class="heading">Mergers</h3>
            <p>
              ${name} has been made a synonym of
              <a class="tag" href="/tags/${encodeURIComponent(synonymOf)}">${synonymOf}</a>.
            </p>
          </div>
        ` : ''}
        ${withRelationships ? `
          <div class="synonym listbox group">
            <ul class="tags commas index group">
              <li><a class="tag" href="/tags/Fluffy%20Stuff">Fluffy Stuff</a></li>
              <li><a class="tag" href="/tags/Soft%20Fluff">Soft Fluff</a></li>
              <li><a class="tag" href="/tags/empty"> </a></li>
            </ul>
          </div>
          <div class="parent listbox group">
            <ul class="tags commas index group">
              <li><a class="tag" href="/tags/No%20Fandom">No Fandom</a></li>
            </ul>
          </div>
          <div class="meta listbox group">
            <ul class="tags tree index">
              <li><a class="tag" href="/tags/Comfort">Comfort</a></li>
              <li>
                <ul class="tags tree index">
                  <li><a class="tag" href="/tags/Emotional%20Hurt*s*Comfort">Emotional Hurt/Comfort</a></li>
                </ul>
              </li>
            </ul>
          </div>
          <div class="sub listbox group">
            <ul class="tags tree index">
              <li>
                <a class="tag" href="/tags/Domestic%20Fluff">Domestic Fluff</a>
                <ul class="tags tree index">
                  <li><a class="tag" href="/tags/Family%20Fluff">Family Fluff</a></li>
                </ul>
              </li>
            </ul>
          </div>
          <div class="child listbox group">
            <div class="relationships listbox group">
              <ul class="tags commas index group">
                <li><a class="tag" href="/tags/Fluff*s*Romance">Fluff/Romance</a></li>
                <li><a class="tag" href="/tags/empty"> </a></li>
                ${childrenTruncated ? '<li>Showing only the first 300 tags.</li>' : ''}
              </ul>
            </div>
            <div class="freeforms listbox group">
              <ul class="tags commas index group">
                <li><a class="tag" href="/tags/Fluff%20and%20Humor">Fluff and Humor</a></li>
              </ul>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `

  return {
    gotScraping: vi.fn().mockImplementation(async (options: { url: string }) => {
      const pathname = new URL(options.url).pathname

      if (pathname === '/tags/Fluff') {
        return {
          statusCode: 200,
          body: createTagPage({
            name: 'Fluff',
            category: 'Additional Tags',
            canonical: true,
            withRelationships: true,
            childrenTruncated: true
          })
        }
      }

      if (pathname === '/tags/Complete%20Children') {
        return {
          statusCode: 200,
          body: createTagPage({
            name: 'Complete Children',
            category: 'Additional Tags',
            canonical: true,
            withRelationships: true
          })
        }
      }

      if (pathname === '/tags/Explicit') {
        return {
          statusCode: 200,
          body: createTagPage({
            name: 'Explicit',
            category: 'Rating',
            canonical: true,
            adult: true
          })
        }
      }

      if (pathname === '/tags/Fluffy%20Stuff') {
        return {
          statusCode: 200,
          body: createTagPage({
            name: 'Fluffy Stuff',
            category: 'Additional Tags',
            synonymOf: 'Fluff'
          })
        }
      }

      if (pathname === '/tags/Unwrangled%20Tag') {
        return {
          statusCode: 200,
          body: createTagPage({
            name: 'Unwrangled Tag',
            category: 'Additional Tags'
          })
        }
      }

      if (pathname === '/tags/Special*s*Tag%20*a*%20With*d*Symbols*q*%20*h*Test') {
        return {
          statusCode: 200,
          body: createTagPage({
            name: 'Special/Tag & With.Symbols? #Test',
            category: 'Additional Tags',
            canonical: true
          })
        }
      }

      if (pathname === '/tags/Invalid%20Tag') {
        return {
          statusCode: 200,
          body: '<html><body>Invalid tag page</body></html>'
        }
      }

      if (pathname === '/tags/Missing%20Name') {
        return {
          statusCode: 200,
          body: createTagPage({
            name: '',
            category: 'Additional Tags'
          })
        }
      }

      if (pathname === '/tags/Unknown%20Category') {
        return {
          statusCode: 200,
          body: createTagPage({
            name: 'Unknown Category',
            category: 'Unknown'
          })
        }
      }

      return {
        statusCode: 404,
        body: 'Not Found'
      }
    })
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getTag', () => {
  it('should return details for a canonical tag', async () => {
    await expect(getTag('Fluff')).resolves.toEqual({
      name: 'Fluff',
      category: 'Additional Tags',
      canonical: true,
      adult: false,
      synonymOf: null,
      synonyms: ['Fluffy Stuff', 'Soft Fluff'],
      parents: ['No Fandom'],
      metaTags: ['Comfort', 'Emotional Hurt/Comfort'],
      subTags: ['Domestic Fluff', 'Family Fluff'],
      children: ['Fluff/Romance', 'Fluff and Humor'],
      childrenTruncated: true
    })
  })

  it('should identify an adult rating tag', async () => {
    await expect(getTag('Explicit')).resolves.toEqual({
      name: 'Explicit',
      category: 'Rating',
      canonical: true,
      adult: true,
      synonymOf: null,
      synonyms: [],
      parents: [],
      metaTags: [],
      subTags: [],
      children: [],
      childrenTruncated: false
    })
  })

  it('should return the canonical target for a synonym', async () => {
    await expect(getTag('Fluffy Stuff')).resolves.toEqual({
      name: 'Fluffy Stuff',
      category: 'Additional Tags',
      canonical: false,
      adult: false,
      synonymOf: 'Fluff',
      synonyms: [],
      parents: [],
      metaTags: [],
      subTags: [],
      children: [],
      childrenTruncated: false
    })
  })

  it('should return a non-canonical tag without a synonym target', async () => {
    await expect(getTag('Unwrangled Tag')).resolves.toEqual({
      name: 'Unwrangled Tag',
      category: 'Additional Tags',
      canonical: false,
      adult: false,
      synonymOf: null,
      synonyms: [],
      parents: [],
      metaTags: [],
      subTags: [],
      children: [],
      childrenTruncated: false
    })
  })

  it('should not mark a complete child list as truncated', async () => {
    const tag = await getTag('Complete Children')

    expect(tag.children).toEqual(['Fluff/Romance', 'Fluff and Humor'])
    expect(tag.childrenTruncated).toBe(false)
  })

  it('should encode special characters in tag name', async () => {
    const tagName = 'Special/Tag & With.Symbols? #Test'

    await expect(getTag(tagName)).resolves.toMatchObject({ name: tagName })
    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://archiveofourown.org/tags/Special*s*Tag%20*a*%20With*d*Symbols*q*%20*h*Test'
    }))
  })

  it('should pass request options to the request client', async () => {
    const controller = new AbortController()
    const proxyUrl = 'http://localhost:8080'

    await getTag('Fluff', {
      proxyUrl,
      timeoutMs: 5000,
      signal: controller.signal
    })

    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://archiveofourown.org/tags/Fluff',
      proxyUrl,
      timeout: { request: 5000 },
      signal: controller.signal
    }))
  })

  it('should throw TagNotFoundError for a missing tag', async () => {
    await expect(getTag('Missing Tag')).rejects.toBeInstanceOf(TagNotFoundError)
  })

  it('should throw AO3Error for an invalid tag page', async () => {
    await expect(getTag('Invalid Tag')).rejects.toBeInstanceOf(AO3Error)
  })

  it('should throw AO3Error when the tag name is missing', async () => {
    await expect(getTag('Missing Name')).rejects.toBeInstanceOf(AO3Error)
  })

  it('should throw AO3Error for an unknown tag category', async () => {
    await expect(getTag('Unknown Category')).rejects.toBeInstanceOf(AO3Error)
  })
})
