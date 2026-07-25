import { describe, expect, it } from "vitest";
import { buildCommentThreads, flattenCommentThreads, mergeCommentThreads } from "../lib/commentThreads.js";
import { type Comment } from "../types/index.js";

function createComment(id: string, replies: Comment[] = []): Comment {
  return {
    id,
    workId: '1',
    author: `author-${id}`,
    isAuthorGuest: false,
    content: `comment-${id}`,
    posted: '2026-01-01',
    threadId: '100',
    depth: 0,
    kudos: 0,
    replies
  }
}

describe("flattenCommentThreads", () => {
  it('return comment copies in parent-before-descendants order', () => {
    const comment102 = createComment('102')
    const comment101 = createComment('101', [comment102])
    const comment103 = createComment('103')
    const comment100 = createComment('100', [comment101, comment103])

    const flattened = flattenCommentThreads([comment100])

    expect(flattened.map(comment => comment.id)).toEqual(['100', '101', '102', '103'])
    expect(flattened.every(comment => comment.replies.length === 0)).toBe(true)
    expect(flattened[0]).not.toBe(comment100)
    expect(flattened[1]).not.toBe(comment101)
    expect(comment100.replies).toEqual([comment101, comment103])
    expect(comment101.replies).toEqual([comment102])
  })
})

describe('mergeCommentThreads', () => {
  it('merges comment threads from multiple pages', () => {
    const comment100 = createComment('100')
    const comment101 = {
      ...createComment('101'),
      parentId: '100',
    }
    const comment200 = {
      ...createComment('200'),
      parentId: '100',
    }

    const page1 = buildCommentThreads([comment100, comment101])
    const page2 = buildCommentThreads([comment200])
    const merged = mergeCommentThreads([page1, page2])

    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('100')
    expect(merged[0].replies.map(comment => comment.id)).toEqual(['101', '200'])
    expect(merged[0].replies.every(comment => comment.depth === 1)).toBe(true)
  })
})
