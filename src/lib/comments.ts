import { request } from './request.js'
import { parseCommentList } from './parsers.js'
import {
  AO3Error,
  RequestOptions,
  ChapterNotFoundError,
  Comment,
  CommentResults,
  WorkNotFoundError,
  AllCommentResults,
} from '../types/index.js'
import { iteratePages } from './pagination.js'
import { mergeCommentThreads } from './commentThreads.js'

/**
 * Get comments for a specific work with threading support
 * @param workId The work ID to get comments for
 * @param page The page number (default: 1)
 * @param requestOptions Optional request options for the request
 * @returns Promise<CommentResults> The work's comments with threading and pagination info
 */
export async function getWorkComments(
  workId: string,
  page: number = 1,
  requestOptions?: RequestOptions
): Promise<CommentResults> {
  const url = `https://archiveofourown.org/works/${workId}?show_comments=true&view_full_work=true&view_adult=true&page=${page}`

  try {
    const html = await request(url, requestOptions)
    const result = parseCommentList(html, workId)

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
 * @param requestOptions Optional request options for the request
 * @returns Promise<CommentResults> The chapter's comments with threading and pagination info
 */
export async function getChapterComments(
  workId: string,
  chapterId: string,
  page: number = 1,
  requestOptions?: RequestOptions
): Promise<CommentResults> {
  const url = `https://archiveofourown.org/chapters/${chapterId}?show_comments=true&view_adult=true&page=${page}`

  try {
    const html = await request(url, requestOptions)
    const result = parseCommentList(html, workId)

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

export async function getAllWorkComments(workId: string, requestOptions?: RequestOptions): Promise<AllCommentResults> {
  const pages: Comment[][] = []
  let total = 1
  let totalPages = 1

  for await (const result of iteratePages(
    page => getWorkComments(workId, page, requestOptions)
  )) {
    pages.push(result.comments)
    total = result.total
    totalPages = result.totalPages
  }

  return {
    comments: mergeCommentThreads(pages),
    total,
    totalPages
  }
}
