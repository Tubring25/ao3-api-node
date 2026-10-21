import * as cheerio from 'cheerio';

import {
  RequestOptions,
  Collection,
  CollectionChallengeType,
  SearchResults,
  AO3Error,
  CollectionNotFoundError
} from "../types/index.js";
import { requestResource } from './requestResource.js'
import { parseWorkList } from './parsers.js';

/**
 * Gets core public information for a collection
 * @param name The unique collection name
 * @param requestOptions Request options
 * @returns A promise that resolves to the collection information
 */
async function getCollection(name: string, requestOptions?: RequestOptions): Promise<Collection> {
  const encodedName = encodeURIComponent(name)
  const collectionPath = `/collections/${encodedName}`
  const url = `https://archiveofourown.org${collectionPath}`

  const html = await requestResource(url, requestOptions, () => new CollectionNotFoundError(name))
  const $ = cheerio.load(html)

  if (!$('#main.collections-show').length || !$('#collection-page.collection.home').length) {
    throw new AO3Error(`Invalid collection page for collection: ${name}`)
  }

  const header = $('#collection-page .primary.header').first()
  const description = header.find('blockquote.userstuff').first()
  const statuses = header.find('p.type').text()
    .replace(/[()]/g, '')
    .split(',')
    .map(status => status.trim())
    .filter(Boolean)

  const challengeType: CollectionChallengeType | null = statuses.includes('Gift Exchange Challenge')
    ? 'GiftExchange'
    : statuses.includes('Prompt Meme Challenge')
      ? 'PromptMeme'
      : null

  const parseContentCount = (section: 'works' | 'bookmarks'): number => {
    const href = `${collectionPath}/${section}`
    const text = $('#dashboard a')
      .filter((_, element) => $(element).attr('href') === href)
      .first()
      .text()
    const match = text.match(/\(([\d,]+)\)/)

    return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0
  }

  return {
    name,
    title: header.find('h2.heading').first().text().trim(),
    descriptionHtml: description.length ? description.html()?.trim() || null : null,
    closed: statuses.includes('Closed'),
    moderated: statuses.includes('Moderated'),
    unrevealed: statuses.includes('Unrevealed'),
    anonymous: statuses.includes('Anonymous'),
    challengeType,
    workCount: parseContentCount('works'),
    bookmarkCount: parseContentCount('bookmarks')
  }
}

async function getCollectionWorks(name: string, page: number = 1, requestOptions?: RequestOptions): Promise<SearchResults> {
  const encodedName = encodeURIComponent(name)
  const collectionPath = `/collections/${encodedName}/works?page=${page}`
  const url = `https://archiveofourown.org${collectionPath}`

  const html = await requestResource(url, requestOptions, () => new CollectionNotFoundError(name))
  const $ = cheerio.load(html)

  if (!$('#main.works-index').length) {
    throw new AO3Error(`Invalid collection page for collection: ${name}`)
  }

  if(!$(`#dashboard a[href="/collections/${encodedName}"]`).length) {
    throw new CollectionNotFoundError(name)
  }

  const results = parseWorkList(html)

  return results
}

export { getCollection, getCollectionWorks }
