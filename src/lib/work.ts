import * as cheerio from 'cheerio';

import { AO3Error, AuthenticationRequiredError, Chapter, ChapterContent, ChapterNotFoundError, RequestOptions, Work, WorkNotFoundError, WorkDownloadLink } from "../types/index.js";
import { request } from './request.js';

/**
 * Get a work by ID
 * @param workId - The ID of the work to get
 * @returns {Promise<Work>} The work details
 */
async function getWork(workId: string, options?: RequestOptions): Promise<Work> {
  const url = `https://archiveofourown.org/works/${workId}?view_adult=true&view_full_work=true`

  try {
    const html = await request(url, options)
    const $ = cheerio.load(html)

    // check if login limited
    if ($('#loginform form#new_user').length > 0) {
      throw new AuthenticationRequiredError(workId)
    }

    // check if the work exists
    if (!$('h2.title.heading').length) {
      throw new AO3Error(`Invalid work page for work ID: ${workId}`)
    }

    // extract work details
    const statsNode = $('dl.stats')
    const chaptersText = statsNode.find('dd.chapters').text()
    const [postedChapters, totalChapters] = chaptersText.split('/').map(s => s.trim())

    const authors = $('a[rel="author"]').map((_, el) => $(el).text().trim()).get()
    // anonymous author
    if (authors.length === 0) {
      const anonymousAuthor = $(
          '#workskin > .preface.group > h3.byline.heading'
        ).first().text().trim()
      anonymousAuthor && authors.push(anonymousAuthor)
    }

    // series info
    const series: Work['series'] = []

    $('dd.series span.position').each((_, el) => {
      const positionElement = $(el)
      const seriesLink = positionElement.find('a[href^="/series/"]').first()

      const href = seriesLink.attr('href')
      const id = href?.match(/\/series\/(\d+)/)?.[1]
      const title = seriesLink.text().trim()
      const positionMatch = positionElement.text().match(/Part\s+(\d+)\s+of/i)

      if (!id || !title || !positionMatch) return

      series.push({id, title, position: parseInt(positionMatch[1], 10)})
    })

    const workData: Work = {
      id: workId,
      title: $('h2.title.heading').text().trim(),
      author: authors[0] ?? '',
      authors: authors,
      summary: $('.summary .userstuff').html() || '',
      language: $('dd.language').text().trim(),
      stats: {
        published: statsNode.find('dd.published').text().trim(),
        updated: statsNode.find('dd.status').text().trim() || undefined,
        words: parseInt(statsNode.find('dd.words').text().replace(/,/g, ''), 10) || 0,
        chapters: {
          posted: parseInt(postedChapters, 10) || 0,
          total: totalChapters === '?' ? null : parseInt(totalChapters, 10)
        },
        hits: parseInt(statsNode.find('dd.hits').text().replace(/,/g, ''), 10) || 0,
        comments: parseInt(statsNode.find('dd.comments').text().replace(/,/g, ''), 10) || 0,
        bookmarks: parseInt(statsNode.find('dd.bookmarks').text().replace(/,/g, ''), 10) || 0,
        kudos: parseInt(statsNode.find('dd.kudos').text().replace(/,/g, ''), 10) || 0,
      },
      tags: {
        rating: $('dd.rating a.tag').text().trim().replace(/\s+/g, ' '),
        warnings: $('dd.warning a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
        category: $('dd.category a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
        fandoms: $('dd.fandom a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
        relationships: $('dd.relationship a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
        characters: $('dd.character a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
        freeforms: $('dd.freeform a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get()
      },
      series,
    }

    return workData
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new WorkNotFoundError(workId)
    }

    throw error
  }
}

/**
 * Gets a list of chapters for a work
 * @param workId - The ID of the work
 * @returns A promise that resolves to an array of chapters
 */
async function getChapters(workId: string, options?: RequestOptions): Promise<Chapter[]> {
  const url = `https://archiveofourown.org/works/${workId}?view_adult=true&view_full_work=true`
  try {
    const html = await request(url, options)
    const $ = cheerio.load(html)

    // check if login limited
    if ($('#loginform form#new_user').length > 0) {
      throw new AuthenticationRequiredError(workId)
    }

    // check if the work exists
    if (!$('h2.title.heading').length) {
      throw new AO3Error(`Invalid work page for work ID: ${workId}`)
    }

    const chapterOptions = $('#chapter_index select option')

    if (chapterOptions.length > 0) {
      return chapterOptions.map((i, el) => ({
        id: $(el).attr('value') || '',
        title: $(el).text().replace(/^\d+\.\s*/, '').trim(),
      })).get()
    } else {
      return [{
        id: workId,
        title: $('h2.title.heading').text().trim(),
      }]
    }
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new WorkNotFoundError(workId)
    }

    throw error
  }
}

/**
* Gets the content for a specific chapter
* @param workId The ID of the work
* @param chapterId The ID of the chapter
* @returns A promise that resolves to the content of the chapter
*/
async function getChapterContent(
  workId: string,
  chapterId: string,
  options?: RequestOptions
): Promise<ChapterContent> {
  const url = `https://archiveofourown.org/works/${workId}/chapters/${chapterId}?view_adult=true`
  try {
    const html = await request(url, options)
    const $ = cheerio.load(html)

    // check authentation limited
    if ($('#loginform form#new_user').length > 0) {
      throw new AuthenticationRequiredError(workId)
    }

    // check content not found
    if (!$('div.userstuff[role="article"]').length) {
      throw new AO3Error(
        `Invalid chapter page for chapter ID: ${chapterId}`
      )
    }

    const getUserstuffHtml = (selector: string): string | null => {
      const el = $(selector).find('blockquote.userstuff')
      return el.length > 0 ? el.html() : null
    }

    const chapterData: ChapterContent = {
      workId,
      chapterId,
      title: $('h3.title').text().trim(),
      summary: getUserstuffHtml('#summary'),
      notes: getUserstuffHtml('div#notes'),
      content: $('div.userstuff[role="article"]').html() || '',
      endNotes: getUserstuffHtml('div.end.notes')
    }

    return chapterData
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new ChapterNotFoundError(workId, chapterId)
    }

    throw error
  }
}

async function getWorkDownloadLinks(workId: string, options?: RequestOptions): Promise<WorkDownloadLink[]> {
  const url = `https://archiveofourown.org/works/${workId}?view_adult=true&view_full_work=true`

  try {
    const html = await request(url, options)
    const $ = cheerio.load(html)

    // check if login limited
    if ($('#loginform form#new_user').length > 0) {
      throw new AuthenticationRequiredError(workId)
    }

    // check if the work exists
    if (!$('h2.title.heading').length) {
      throw new AO3Error(`Invalid work page for work ID: ${workId}`)
    }

    const downloadLinks: WorkDownloadLink[] = []

    $('li.download a[href*="/downloads/"]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return

      const downloadUrl = new URL(href, 'https://archiveofourown.org')
      const format = downloadUrl.pathname.split('.').pop()?.toUpperCase()
      if (format === 'HTML' || format === 'EPUB' || format === 'PDF' || format === 'MOBI' || format === 'AZW3') {
        downloadLinks.push({ format, url: downloadUrl.toString() })
      }
    })

    return downloadLinks

  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new WorkNotFoundError(workId)
    }

    throw error
  }
}

export { getWork, getChapters, getChapterContent, getWorkDownloadLinks }
