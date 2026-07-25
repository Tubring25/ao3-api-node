import { Comment } from "../types/comment.js"


/**
 *
 * @param comments
 * @returns
 */
export function buildCommentThreads(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>()
  const rootComments: Comment[] = []

  // First pass: create map of all comments
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  // Second pass: build the tree structure
  comments.forEach(comment => {
    const commentCopy = commentMap.get(comment.id)!

    if (comment.parentId && commentMap.has(comment.parentId)) {
      const parent = commentMap.get(comment.parentId)!
      parent.replies.push(commentCopy)
    } else {
      rootComments.push(commentCopy)
    }
  })

  const setDepth = (comment: Comment, depth: number) => {
    comment.depth = depth
    comment.replies.forEach(reply => setDepth(reply, depth + 1))
  }
  rootComments.forEach(comment => setDepth(comment, 0))

  return rootComments
}

/**
 * Flattens a comment thread into a single array of comments
 * @param comments
 * @returns
 */
export function flattenCommentThreads(comments: Comment[]): Comment[] {
  const flattenedComment: Comment[] = []

  comments.forEach(comment => {
    flattenedComment.push({ ...comment, replies: [] })
    flattenedComment.push(...flattenCommentThreads(comment.replies))
  })

  return flattenedComment
}


export function mergeCommentThreads(pages: Comment[][]): Comment[]{
  const comments: Comment[] = []

  pages.forEach(page => {
    comments.push(...flattenCommentThreads(page))
  })

  return buildCommentThreads(comments)
}
