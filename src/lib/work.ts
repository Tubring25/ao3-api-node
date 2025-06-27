import * as cheerio from 'cheerio';

import { Chapter, ChapterContent, Work } from "../types/index.js";
import { request } from './request.js';

/**
 * Get a work by ID
 * @param workId - The ID of the work to get
 * @returns {Promise<Work>} The work details
 */
async function getWork(workId: string, options?: { proxyUrl?: string }): Promise<Work> {
  const url = `https://archiveofourown.org/works/${workId}?view_adult=true&view_full_work=true`

  const html = await request(url, options?.proxyUrl)
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

  const html = await request(url, options?.proxyUrl)
  const $ = cheerio.load(html)

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

  const html = await request(url, options?.proxyUrl)
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