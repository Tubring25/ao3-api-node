import * as cheerio from 'cheerio';
import { SearchResults, WorkSearchResult } from '../types/index.js';


/**
 * Parses the HTML of a work listing page (search, tags)
 * @param html The HTML of the work listing page
 * @returns {SearchResults} The parsed works and total result count
 */
export function parseWorkList(html: string): SearchResults {
  const $ = cheerio.load(html)

  let totalResults = 0
  const headings = $('h2.heading, h3.heading')

  headings.each((i, el) => {
    const headingText = $(el).text().trim()

    let match = headingText.match(/of ([\d,]+) Works/)
    if (match && match[1]) {
      totalResults = parseInt(match[1].replace(/,/g, ''), 10)
      return false
    }

    match = headingText.match(/^([\d,]+) Found/)
    if (match && match[1]) {
      totalResults = parseInt(match[1].replace(/,/g, ''), 10)
      return false
    }
  })

  const works: WorkSearchResult[] = $('ol.work.index li.work')
    .map((i, el) => parseWorkBlurb(el, $))
    .get()

  return { works, totalResults }
}


export function parseWorkBlurb(
  // @ts-expect-error - Element is not exported from cheerio
  element: cheerio.Element,
  $: cheerio.CheerioAPI
): WorkSearchResult {
  // We now use the passed-in Cheerio instance to wrap the element
  const workElement = $(element)

  const parseStat = (className: string): number => {
    const text = workElement.find(`dd.${className}`).text().replace(/,/g, '')
    return parseInt(text, 10) || 0
  }

  return {
    id: workElement.attr('id')?.replace('work_', '') || '',
    title: workElement.find('h4.heading a').first().text(),
    author: workElement.find('a[rel="author"]').text(),
    fandoms: workElement.find('h5.fandoms a').map((i, fandomEl) => $(fandomEl).text()).get(),
    words: parseStat('words'),
    kudos: parseStat('kudos'),
    hits: parseStat('hits'),
  }
}