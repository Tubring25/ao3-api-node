import { request } from './request.js'
import { parseCommentList } from './parsers.js'
import {
  AO3Error,
  ChapterNotFoundError,
  Comment,
  CommentResults,
  WorkNotFoundError
} from '../types/index.js'

/**
 * Get comments for a specific work with threading support
 * @param workId The work ID to get comments for
 * @param page The page number (default: 1)
 * @param proxyUrl Optional proxy URL for the request
 * @returns Promise<CommentResults> The work's comments with threading and pagination info
 */
export async function getWorkComments(
  workId: string,
  page: number = 1,
  proxyUrl?: string
): Promise<CommentResults> {
  const url = `https://archiveofourown.org/works/${workId}?show_comments=true&view_full_work=true&page=${page}`

  try {
    const html = await request(url, proxyUrl)
    const result = parseCommentList(html)

    // Set workId for all comments since it might not be available in the HTML
    const setWorkId = (comments: Comment[]): Comment[] => {
      return comments.map(comment => ({
        ...comment,
        workId: comment.workId || workId,
        replies: setWorkId(comment.replies)
      }))
    }

    return {
      ...result,
      comments: setWorkId(result.comments)
    }
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new WorkNotFoundError(workId)
    }
    throw error
  }
}

/**
 * Get comments for a specific chapter
 * @param workId The work ID
 * @param chapterId The chapter ID to get comments for
 * @param page The page number (default: 1)
 * @param proxyUrl Optional proxy URL for the request
 * @returns Promise<CommentResults> The chapter's comments with threading and pagination info
 */
export async function getChapterComments(
  workId: string,
  chapterId: string,
  page: number = 1,
  proxyUrl?: string
): Promise<CommentResults> {
  const url = `https://archiveofourown.org/chapters/${chapterId}?show_comments=true&page=${page}`

  try {
    const html = await request(url, proxyUrl)
    const result = parseCommentList(html)

    // Set workId and chapterId for all comments
    const setIds = (comments: Comment[]): Comment[] => {
      return comments.map(comment => ({
        ...comment,
        workId: comment.workId || workId,
        chapterId: comment.chapterId || chapterId,
        replies: setIds(comment.replies)
      }))
    }

    return {
      ...result,
      comments: setIds(result.comments)
    }
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new ChapterNotFoundError(workId, chapterId)
    }
    throw error
  }
}
