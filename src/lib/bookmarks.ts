import { request } from './request.js'
import { parseBookmarkList, parseWorkBookmarkList } from './parsers.js'
import {
  AO3Error,
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
  const url = `https://archiveofourown.org/users/${username}/bookmarks?page=${page}`

  try {
    const html = await request(url, requestOptions)
    return parseBookmarkList(html)
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new UserNotFoundError(username)
    }
    throw error
  }
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
  const url = `https://archiveofourown.org/works/${workId}/bookmarks?page=${page}`

  try {
    const html = await request(url, requestOptions)
    return parseWorkBookmarkList(html)
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new WorkNotFoundError(workId)
    }
    throw error
  }
}
