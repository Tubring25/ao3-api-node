import { requestResource } from './requestResource.js'
import { parseBookmarkList, parseWorkBookmarkList } from './parsers.js'
import {
  RequestOptions,
  BookmarkResults,
  UserNotFoundError,
  WorkNotFoundError
} from '../types/index.js'

/**
 * Get a user's bookmarks with pagination
 * @param username The username to get bookmarks for
 * @param page The page number (default: 1)
 * @param requestOptions Optional request options for the request
 * @returns Promise<BookmarkResults> The user's bookmarks with pagination info
 */
export async function getUserBookmarks(
  username: string,
  page: number = 1,
  requestOptions?: RequestOptions
): Promise<BookmarkResults> {
  const url = `https://archiveofourown.org/users/${encodeURIComponent(username)}/bookmarks?page=${page}`

  const html = await requestResource(url, requestOptions, () => new UserNotFoundError(username))
  return parseBookmarkList(html)
}

/**
 * Get bookmarks for a specific work
 * @param workId The work ID to get bookmarks for
 * @param page The page number (default: 1)
 * @param requestOptions Optional request options for the request
 * @returns Promise<BookmarkResults> The work's bookmarks with pagination info
 */
export async function getWorkBookmarks(
  workId: string,
  page: number = 1,
  requestOptions?: RequestOptions
): Promise<BookmarkResults> {
  const url = `https://archiveofourown.org/works/${encodeURIComponent(workId)}/bookmarks?page=${page}`

  const html = await requestResource(url, requestOptions, () => new WorkNotFoundError(workId))
  return parseWorkBookmarkList(html)
}
