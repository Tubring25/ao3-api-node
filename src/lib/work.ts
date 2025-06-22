import { gotScraping } from "got-scraping";
import * as cheerio from 'cheerio';
import { Chapter, ChapterContent, Work } from "../types/index.js";

/**
 * Get a work by ID
 * @param workId - The ID of the work to get
 * @returns {Promise<Work>} The work details
 */
async function getWork(workId: string, options?: { proxyUrl?: string }): Promise<Work> {

  const url = `https://archiveofourown.org/works/${workId}?view_adult=true&view_full_work=true`

  const response = await gotScraping({
    url: url,
    proxyUrl: options?.proxyUrl,
  });

  // Handle HTTP errors
  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch work ${workId}. Status: ${response.statusCode}`)
  }

  const html = response.body
  const $ = cheerio.load(html)

  // Extract work details
  const statsNode = $('dl.stats')
  const chaptersText = statsNode.find('dd.chapters').text()
  const [postedChapters, totalChapters] = chaptersText.split('/').map(s => s.trim())

  const workData: Work = {
    id: workId,
    title: $('h2.title.heading').text().trim(),
    author: $('a[rel="author"]').text().trim(),
    summary: $('.summary .userstuff').html() || '',
    language: $('dd.language').text().trim(),
    stats: {
      published: statsNode.find('dd.published').text().trim(),
      updated: statsNode.find('dd.updated').text().trim() || undefined,
      words: parseInt(statsNode.find('dd.words').text().replace(/,/g, ''), 10) || 0,
      chapters: {
        posted: parseInt(postedChapters, 10) || 0,
        total: totalChapters === '?' ? null : parseInt(totalChapters, 10)
      },
      hits: parseInt(statsNode.find('dd.hits').text().replace(/,/g, ''), 10) || 0
    },
    tags: {
      rating: $('dd.rating a.tag').text().trim().replace(/\s+/g, ' '),
      warnings: $('dd.warning a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
      category: $('dd.category a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
      fandoms: $('dd.fandom a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
      relationships: $('dd.relationship a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
      characters: $('dd.character a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get(),
      freeforms: $('dd.freeform a.tag').map((i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get()
    }
  }

  return workData
}

/**
 * Gets a list of chapters for a work
 * @param workId - The ID of the work
 * @returns A promise that resolves to an array of chapters
 */
async function getChapters(workId: string, options?: { proxyUrl?: string }): Promise<Chapter[]> {
  const url = `https://archiveofourown.org/works/${workId}?view_adult=true&view_full_work=true`

  const response = await gotScraping({
    url: url,
    proxyUrl: options?.proxyUrl
  })

  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch chapters for work ${workId}. Status: ${response.statusCode}`)
  }

  const html = response.body
  const $ = cheerio.load(html)

  // Find the multi-chapter index list
  const chapterOptions = $('#chapter_index select option')

  if (chapterOptions.length > 0) {
    // Case 1: Multi-chapter work
    const chapters: Chapter[] = chapterOptions.map((i, el) => {
      const chapterId = $(el).attr('value') || ''
      const titleText = $(el).text()
      const title = titleText.replace(/^\d+\.\s*/, '').trim()

      return {
        id: chapterId,
        title: title,
      }
    }).get()

    return chapters
  } else {
    // Case 2: Single-chapter work
    const workTitle = $('h2.title.heading').text().trim()

    return [{
      id: workId,
      title: workTitle
    }]
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
  options?: { proxyUrl?: string }
): Promise<ChapterContent> {
  const url = `https://archiveofourown.org/works/${workId}/chapters/${chapterId}`

  const response = await gotScraping({
    url: url,
    proxyUrl: options?.proxyUrl
  })

  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch chapter ${chapterId} for work ${workId}. Status: ${response.statusCode}`)
  }

  const html = response.body
  const $ = cheerio.load(html)

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
}

export { getWork, getChapters, getChapterContent }