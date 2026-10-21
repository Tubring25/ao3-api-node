import * as cheerio from 'cheerio';

import { AO3Error, RequestOptions, Series, SeriesNotFoundError } from "../types/index.js";
import { parseWorkBlurb } from "./parsers.js";
import { requestResource } from './requestResource.js'
/**
 * Gets information and a list of works for a specific series
 * @param seriesId The ID of the series
 * @param requestOptions Request options
 * @returns A promise that resolves to a series object
 */
async function getSeries(seriesId: string, requestOptions?: RequestOptions): Promise<Series> {
  const url = `https://archiveofourown.org/series/${encodeURIComponent(seriesId)}`

  const html = await requestResource(url, requestOptions, () => new SeriesNotFoundError(seriesId))
  const $ = cheerio.load(html)

  const seriesMeta = $('dl.series.meta')
  if (!seriesMeta.length || !$('h2.heading').first().text().trim()) {
    throw new AO3Error(`Invalid series page for series ID: ${seriesId}`)
  }
  const getMetaText = (label: string) => seriesMeta.find(`dt:contains("${label}")`).next('dd').text().trim()
  const getNumericStat = (label: string) => parseInt(getMetaText(label).replace(/,/g, ''), 10) || 0

  return {
    id: seriesId,
    title: $('h2.heading').text().trim(),
    authors: seriesMeta.children('dt').filter((_, el) => /^Creators?:$/.test($(el).text().trim()))
      .next('dd').find('a[rel="author"]').map((_, el) => $(el).text().trim()).get(),
    description: seriesMeta.children('dt:contains("Description:")').next('dd').find('.userstuff').html() || null,
    notes: seriesMeta.children('dt:contains("Notes:")').next('dd').find('.userstuff').html() || null,
    stats: {
      words: getNumericStat('Words'),
      works: getNumericStat('Works'),
      complete: getMetaText('Complete:') === 'Yes',
      bookmarks: getNumericStat('Bookmarks')
    },
    works: $('ul.series.work li.work').map((i, el) => parseWorkBlurb(el, $)).get()
  }
}

export { getSeries }
