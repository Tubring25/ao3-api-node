import * as cheerio from 'cheerio';

import { Series } from "../types/index.js";
import { parseWorkBlurb } from "./parsers.js";
import { request } from './request.js';
/**
 * Gets information and a list of works for a specific series
 * @param seriesId The ID of the series
 * @param requestOptions Request options
 * @returns A promise that resolves to a series object
 */
async function getSeries(seriesId: string, requestOptions?: {proxyUrl?: string}): Promise<Series> {
  const url = `https://archiveofourown.org/series/${seriesId}`

  const html = await request(url, requestOptions?.proxyUrl)
  const $ = cheerio.load(html)

  const seriesMeta = $('dl.series.meta')
  const getMetaText = (label: string) => seriesMeta.find(`dt:contains("${label}")`).next('dd').text().trim()
  const getNumericStat = (label: string) => parseInt(getMetaText(label).replace(/,/g, ''), 10) || 0
  
  return {
    id: seriesId,
    title: $('h2.heading').text().trim(),
    authors: seriesMeta.find('dt:contains("Creator:")').next('dd').find('a').map((i, el) => $(el).text()).get(),
    description: $('div.series.meta.group .userstuff').first().html() || null,
    notes: $('div.series.meta.group .notes .userstuff').html() || null,
    stats: {
      words: getNumericStat('Words'),
      works: getNumericStat('Works'),
      complete: getMetaText('Complete?') === 'Yes',
      bookmarks: getNumericStat('Bookmarks')
    },
    works: $('ul.series.work li.work').map((i, el) => parseWorkBlurb(el, $)).get()
  }
}

export { getSeries }