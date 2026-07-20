import { SearchOptions, SearchResults, TagWorksOptions } from "../types/index.js";
import { request } from "./request.js";
import { parseWorkList } from "./parsers.js";
import { categoryMap, ratingMap, sortColumnMap, warningMap, crossoverMap } from "./constants.js";

/**
 * Searches for works based on a query and filters
 * @param options Search options
 * @returns A promise that resolves to a paginated list of works search results
 */
async function search(options: SearchOptions, requestOptions?: {proxyUrl?: string}): Promise<SearchResults> {
  const params = new URLSearchParams()

  const addParam = (key: string, value: string | undefined) => value && params.set(key, value)
  const addArrayParam = (key: string, values: string[] | undefined) => values?.forEach(v => params.append(key, v))

  if (options.page !== undefined) params.set('page', String(options.page))
  addParam('work_search[query]', options.query)
  addParam('work_search[title]', options.title)
  addParam('work_search[creators]', options.creators)
  addParam('work_search[revised_at]', options.revisedAt)
  if(options.complete !== undefined) params.set('work_search[complete]', options.complete ? 'T' : 'F')
  if(options.crossover !== undefined) params.set('work_search[crossover]', crossoverMap[options.crossover])
  if(options.singleChapter) params.set('work_search[single_chapter]', '1')
  addParam('work_search[word_count]', options.wordCount)
  addParam('work_search[language_id]', options.language)
  addParam('work_search[hits]', options.hits)
  addParam('work_search[kudos_count]', options.kudos)
  addParam('work_search[comments_count]', options.comments)
  addParam('work_search[bookmarks_count]', options.bookmarks)

  addParam('work_search[fandom_names]', options.fandoms?.join(','))
  addParam('work_search[character_names]', options.characters?.join(','))
  addParam('work_search[relationship_names]', options.relationships?.join(','))
  addParam('work_search[freeform_names]', options.freeforms?.join(','))

  // Mapped params
  if(options.rating !== undefined) addParam('work_search[rating_ids]', ratingMap[options.rating])
  addArrayParam('work_search[archive_warning_ids][]', options.warnings?.map(w => warningMap[w]))
  addArrayParam('work_search[category_ids][]', options.categories?.map(c => categoryMap[c]))

  // Sorting
  params.set('work_search[sort_column]', sortColumnMap[options.sortColumn || 'Best Match'])
  params.set('work_search[sort_direction]', options.sortDirection || 'desc')

  const url = `https://archiveofourown.org/works/search?commit=Search&${params.toString()}`

  const html = await request(url, requestOptions?.proxyUrl)

  return parseWorkList(html)
}

/**
 * Gets a paginated list of works for a specific tag
 * @param tag The tag to search for
 * @param page The page number to fetch
 * @param options Tag listing filters
 * @param requestOptions Request options
 * @returns A promise that resolves to a paginated list of works
 */
async function getTagWorks(tag: string, page: number = 1, options: TagWorksOptions = {}, requestOptions?: {proxyUrl?: string}): Promise<SearchResults> {
  const params = new URLSearchParams({
    page: String(page),
    tag_id: tag
  })

  const addParam = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const addArrayParam = (key: string, values: string[] | undefined) => values?.forEach(value => params.append(key, value))

  addParam('work_search[query]', options.query)
  if (options.complete !== undefined) params.set('work_search[complete]', options.complete ? 'T' : 'F')
  addParam('work_search[words_from]', options.wordsFrom)
  addParam('work_search[words_to]', options.wordsTo)
  addParam('work_search[date_from]', options.dateFrom)
  addParam('work_search[date_to]', options.dateTo)
  addParam('work_search[language_id]', options.language)
  if (options.otherTags?.length) params.set('work_search[other_tag_names]', options.otherTags.join(','))

  addArrayParam('include_work_search[rating_ids][]', options.ratings?.map(rating => ratingMap[rating]))
  addArrayParam('include_work_search[archive_warning_ids][]', options.warnings?.map(warning => warningMap[warning]))
  addArrayParam('include_work_search[category_ids][]', options.categories?.map(category => categoryMap[category]))
  params.set('work_search[sort_column]', sortColumnMap[options.sortColumn || 'Date Updated'])

  const url = `https://archiveofourown.org/works?${params.toString()}`

  const html = await request(url, requestOptions?.proxyUrl)

  return parseWorkList(html)
}

export { search, getTagWorks }
