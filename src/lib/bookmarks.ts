import { request } from './request.js'
import { parseBookmarkList, parseWorkBookmarkList } from './parsers.js'
import { BookmarkResults } from '../types/index.js'

/**
 * Get a user's bookmarks with pagination
 * @param username The username to get bookmarks for
 * @param page The page number (default: 1)
 * @param proxyUrl Optional proxy URL for the request
 * @returns Promise<BookmarkResults> The user's bookmarks with pagination info
 */
export async function getUserBookmarks(
  username: string,
  page: number = 1,
  proxyUrl?: string
): Promise<BookmarkResults> {
  const url = `https://archiveofourown.org/users/${username}/bookmarks?page=${page}`

  try {
    const html = await request(url, proxyUrl)
    return parseBookmarkList(html)
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error(`User '${username}' not found or has no public bookmarks`)
    }
    throw error
  }
}

/**
 * Get bookmarks for a specific work
 * @param workId The work ID to get bookmarks for
 * @param page The page number (default: 1)
 * @param proxyUrl Optional proxy URL for the request
 * @returns Promise<BookmarkResults> The work's bookmarks with pagination info
 */
export async function getWorkBookmarks(
  workId: string,
  page: number = 1,
  proxyUrl?: string
): Promise<BookmarkResults> {
  const url = `https://archiveofourown.org/works/${workId}/bookmarks?page=${page}`

  try {
    const html = await request(url, proxyUrl)
    return parseWorkBookmarkList(html)
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error(`Work '${workId}' not found or has no public bookmarks`)
    }
    throw error
  }
}
