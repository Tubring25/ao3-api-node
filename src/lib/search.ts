import { SearchOptions, SearchResults } from "../types/index.js"
import { gotScraping } from "got-scraping"
import { parseWorkList } from "./parsers.js"
import { categoryMap, ratingMap, sortColumnMap, warningMap } from "./constants.js"

/**
 * Searches for works based on a query and filters
 * @param options Search options
 * @returns A promise that resolves to a paginated list of works search results
 */
async function search(options: SearchOptions, requestOptions?: {proxyUrl?: string}): Promise<SearchResults> {
  const params = new URLSearchParams()

  const addParam = (key: string, value: string | undefined) => value && params.set(key, value)
  const addArrayParam = (key: string, values: string[] | undefined) => values?.forEach(v => params.append(key, v))

  addParam('work_search[query]', options.query)
  addParam('work_search[title]', options.title)
  addParam('work_search[creators]', options.creators)
  addParam('work_search[revised_at]', options.revisedAt)
  if(options.complete !== undefined) params.set('work_search[complete]', options.complete ? 'T' : 'F')
  if(options.singleChapter) params.set('work_search[single_chapter]', '1')
  addParam('work_search[word_count]', options.wordCount)
  addParam('work_search[language_id]', options.language)
  addParam('work_search[hits]', options.hits)
  addParam('work_search[kudos_count]', options.kudos)
  addParam('work_search[comments_count]', options.comments)
  addParam('work_search[bookmarks_count]', options.bookmarks)

  // Array params
  addArrayParam('work_search[fandom_names]', options.fandoms)
  addArrayParam('work_search[character_names]', options.characters)
  addArrayParam('work_search[relationship_names]', options.relationships)
  addArrayParam('work_search[freeform_names]', options.freeforms)

  // Mapped params
  addArrayParam('work_search[rating_ids][]', options.ratings?.map(r => ratingMap[r]))
  addArrayParam('work_search[archive_warning_ids][]', options.warnings?.map(w => warningMap[w]))
  addArrayParam('work_search[category_ids][]', options.categories?.map(c => categoryMap[c]))

  // Sorting
  params.set('work_search[sort_column]', sortColumnMap[options.sortColumn || 'Best Match'])
  params.set('work_search[sort_direction]', options.sortDirection || 'desc')

  const url = `https://archiveofourown.org/works/search?commit=Search&${params.toString()}`

  const response = await gotScraping({
    url: url,
    proxyUrl: requestOptions?.proxyUrl
  })

  if (response.statusCode !== 200) {
    throw new Error(`Failed to search for works. Status: ${response.statusCode}`)
  }

  return parseWorkList(response.body)
}

/**
 * Gets a paginated list of works for a specific tag
 * @param tag The tag to search for
 * @param options Search options
 * @param requestOptions Request options
 * @returns A promise that resolves to a paginated list of works
 */
async function getTagWorks(tag: string, page: number = 1, options?: SearchOptions, requestOptions?: {proxyUrl?: string}): Promise<SearchResults> {
  const encodedTag = tag.replace(/\//g, '*s*').replace(/\s/g, '%20')
  const url = `https://archiveofourown.org/tags/${encodedTag}/works?page=${page}`

  const response = await gotScraping({
    url: url,
    proxyUrl: requestOptions?.proxyUrl
  })

  if (response.statusCode !== 200) {
    throw new Error(`Failed to search for works. Status: ${response.statusCode}`)
  }

  return parseWorkList(response.body)
}

export { search, getTagWorks }