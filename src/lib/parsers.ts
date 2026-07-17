import * as cheerio from 'cheerio';
import { SearchResults, WorkSearchResult, BookmarkResults, BookmarkSearchResult, CommentResults, Comment } from '../types/index.js';


/**
 * Parses the HTML of a work listing page (search, tags)
 * @param html The HTML of the work listing page
 * @returns {SearchResults} The parsed works and total result count
 */
export function parseWorkList(html: string): SearchResults {
  const $ = cheerio.load(html)

  let totalResults = 0
  const headings = $('h2.heading, h3.heading')

  headings.each((i, el) => {
    const headingText = $(el).text().trim()

    let match = headingText.match(/of ([\d,]+) Works/)
    if (match && match[1]) {
      totalResults = parseInt(match[1].replace(/,/g, ''), 10)
      return false
    }

    match = headingText.match(/^([\d,]+) Found/)
    if (match && match[1]) {
      totalResults = parseInt(match[1].replace(/,/g, ''), 10)
      return false
    }
  })

  const works: WorkSearchResult[] = $('ol.work.index li.work')
    .map((i, el) => parseWorkBlurb(el, $))
    .get()

  const { page, totalPages } = parsePagination($)

  return { works, totalResults, page, totalPages }
}


export function parseWorkBlurb(
  // @ts-expect-error - Element is not exported from cheerio
  element: cheerio.Element,
  $: cheerio.CheerioAPI
): WorkSearchResult {
  // We now use the passed-in Cheerio instance to wrap the element
  const workElement = $(element)

  const parseStat = (className: string): number => {
    const text = workElement.find(`dd.${className}`).text().replace(/,/g, '')
    return parseInt(text, 10) || 0
  }

  return {
    id: workElement.attr('id')?.replace('work_', '') || '',
    title: workElement.find('h4.heading a').first().text(),
    author: workElement.find('a[rel="author"]').text(),
    fandoms: workElement.find('h5.fandoms a').map((i, fandomEl) => $(fandomEl).text()).get(),
    words: parseStat('words'),
    kudos: parseStat('kudos'),
    hits: parseStat('hits'),
  }
}

/**
 * Parses the HTML of a bookmarks page
 * @param html The HTML of the bookmarks page
 * @returns {BookmarkResults} The parsed bookmarks and pagination info
 */
export function parseBookmarkList(html: string): BookmarkResults {
  const $ = cheerio.load(html)
  const total = parseTotal($('h2.heading').text())

  const bookmarks: BookmarkSearchResult[] = $('ol.bookmark li.bookmark')
    .map((i, el) => parseBookmarkBlurb(el, $))
    .get()

  const { page, totalPages } = parsePagination($)

  return { 
    bookmarks, 
    total, 
    page,
    totalPages 
  }
}

/** Parses the distinct layout used by a work's public bookmarks page. */
export function parseWorkBookmarkList(html: string): BookmarkResults {
  const $ = cheerio.load(html)
  const total = parseTotal($('h2.heading').text())
  const { page, totalPages } = parsePagination($)
  const workElement = $('ol.bookmark > li.work').get(0)

  if (!workElement) {
    return { bookmarks: [], total, page, totalPages }
  }

  const work = parseBookmarkWork(workElement, $)
  const workLink = $(workElement).find('h4.heading a[href*="/works/"]').first()
  const workId = workLink.attr('href')?.match(/\/works\/(\d+)/)?.[1] || ''

  const bookmarks: BookmarkSearchResult[] = $('ol.bookmark > li.user')
    .map((i, el) => {
      const bookmarkElement = $(el)
      const userLink = bookmarkElement.find('h5.byline a[href*="/users/"]').first()

      return {
        bookmark: {
          id: bookmarkElement.attr('id')?.replace('bookmark_', '') || null,
          workId,
          workTitle: work.title,
          workAuthor: work.author,
          userId: userLink.attr('href')?.match(/\/users\/([^/]+)/)?.[1] || '',
          username: userLink.text().trim(),
          created: bookmarkElement.find('.datetime').text().trim(),
          notes: bookmarkElement.find('.notes').first().text().trim() || null,
          tags: bookmarkElement.find('.tag').map((j, tag) => $(tag).text().trim()).get(),
          public: !bookmarkElement.find('.private').length,
          rec: !!bookmarkElement.find('.rec').length
        },
        work
      }
    })
    .get()

  return { bookmarks, total, page, totalPages }
}

function parseBookmarkBlurb(
  // @ts-expect-error - Element is not exported from cheerio
  element: cheerio.Element,
  $: cheerio.CheerioAPI
): BookmarkSearchResult {
  const bookmarkElement = $(element)
  
  const bookmarkId = bookmarkElement.attr('id')?.replace('bookmark_', '') || null
  const workLink = bookmarkElement.find('h4.heading a').first()
  const workId = workLink.attr('href')?.match(/\/works\/(\d+)/)?.[1] || ''
  const work = parseBookmarkWork(element, $)
  
  const userLink = bookmarkElement.find('.user a')
  const username = userLink.text().trim()
  const userId = userLink.attr('href')?.replace('/users/', '') || ''
  
  const created = bookmarkElement.find('.datetime').text().trim()
  const notes = bookmarkElement.find('.notes blockquote').text().trim() || null
  
  const tags = bookmarkElement.find('.tag')
    .map((i, tagEl) => $(tagEl).text().trim())
    .get()
    .filter(tag => tag.length > 0)
  
  const isPublic = !bookmarkElement.find('.private').length
  const isRec = !!bookmarkElement.find('.rec').length

  return {
    bookmark: {
      id: bookmarkId,
      workId,
      workTitle: work.title,
      workAuthor: work.author,
      userId,
      username,
      created,
      notes,
      tags,
      public: isPublic,
      rec: isRec
    },
    work
  }
}

function parseBookmarkWork(
  // @ts-expect-error - Element is not exported from cheerio
  element: cheerio.Element,
  $: cheerio.CheerioAPI
): BookmarkSearchResult['work'] {
  const workElement = $(element)
  const parseStat = (className: string): number => {
    const text = workElement.find(`dd.${className}`).text().replace(/,/g, '')
    return parseInt(text, 10) || 0
  }
  const chapterText = workElement.find('dd.chapters').text().trim()
  const chapterMatch = chapterText.match(/(\d+)\/(\d+|\?)/)

  return {
    title: workElement.find('h4.heading a[href*="/works/"]').first().text().trim(),
    author: workElement.find('a[rel="author"]').text().trim(),
    summary: workElement.find('.summary').first().text().trim(),
    rating: workElement.find('.rating .text').text().trim(),
    warnings: workElement.find('.warnings .text').map((i, el) => $(el).text().trim()).get(),
    categories: workElement.find('.category .text').map((i, el) => $(el).text().trim()).get(),
    fandoms: workElement.find('.fandoms a').map((i, el) => $(el).text().trim()).get(),
    relationships: workElement.find('.relationships a').map((i, el) => $(el).text().trim()).get(),
    characters: workElement.find('.characters a').map((i, el) => $(el).text().trim()).get(),
    additionalTags: workElement.find('.freeforms a').map((i, el) => $(el).text().trim()).get(),
    language: workElement.find('dd.language').text().trim(),
    published: workElement.find('dd.published').text().trim(),
    updated: workElement.find('dd.status').text().trim() || null,
    words: parseStat('words'),
    chapters: {
      posted: chapterMatch ? parseInt(chapterMatch[1], 10) : 1,
      total: chapterMatch && chapterMatch[2] !== '?' ? parseInt(chapterMatch[2], 10) : null
    },
    completed: chapterMatch ? chapterMatch[1] === chapterMatch[2] : true,
    kudos: parseStat('kudos'),
    comments: parseStat('comments'),
    bookmarks: parseStat('bookmarks'),
    hits: parseStat('hits')
  }
}

/**
 * Parses the HTML of a comments page
 * @param html The HTML of the comments page
 * @returns {CommentResults} The parsed comments with threading
 */
export function parseCommentList(html: string): CommentResults {
  const $ = cheerio.load(html)
  const commentsToggleText = $('a[href*="/comments/hide_comments"]').text()
  const currentTotalMatch = commentsToggleText.match(/\(([\d,]+)\)/)
  const legacyTotalMatch = $('h3.heading').text().match(/([\d,]+) Comments/)
  const totalMatch = currentTotalMatch || legacyTotalMatch
  const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0

  const comments: Comment[] = $('[id^="comment_"].comment')
    .filter((i, el) => /^comment_\d+$/.test($(el).attr('id') || ''))
    .map((i, el) => parseComment(el, $))
    .get()

  const { page, totalPages } = parsePagination($)

  return { 
    comments: buildCommentThreads(comments), 
    total, 
    page,
    totalPages 
  }
}

function parseComment(
  // @ts-expect-error - Element is not exported from cheerio
  element: cheerio.Element,
  $: cheerio.CheerioAPI
): Comment {
  const commentElement = $(element)
  
  const id = commentElement.attr('id')?.replace('comment_', '') || ''
  
  // Try to extract workId from various sources in the comment
  let workId = ''
  const workLink = commentElement.find('a[href*="/works/"]').first()
  if (workLink.length) {
    const workMatch = workLink.attr('href')?.match(/\/works\/(\d+)/)
    workId = workMatch?.[1] || ''
  }
  
  const chapterMatch = commentElement.find('a[href*="/chapters/"]').attr('href')?.match(/\/chapters\/(\d+)/)
  const chapterId = chapterMatch?.[1] || undefined
  
  const authorElement = commentElement.find('.byline a').first()
  const author = authorElement.text().trim()
  const authorId = authorElement.attr('href')?.replace('/users/', '') || undefined
  const isAuthorGuest = authorElement.hasClass('guest')
  
  const directContent = commentElement.children('.userstuff').first()
  const legacyContent = commentElement.children('.comment').first().find('.userstuff').first()
  const content = (directContent.length ? directContent : legacyContent).html() || ''
  const posted = commentElement.find('.datetime').text().trim()
  const edited = commentElement.find('.edited').text().trim() || undefined
  
  const actionLinks = commentElement.find('ul.actions a')
  const actionCommentId = (label: string): string | undefined => {
    const href = actionLinks
      .filter((i, link) => $(link).text().trim() === label)
      .first()
      .attr('href')
    return href?.match(/\/comments\/(\d+)/)?.[1]
  }
  const parentElement = commentElement.parents('[id^="comment_"].comment').first()
  const parentId = actionCommentId('Parent')
    || (parentElement.length ? parentElement.attr('id')?.replace('comment_', '') : undefined)

  const threadElement = commentElement.closest('.thread')
  const threadId = actionCommentId('Parent Thread')
    || threadElement.attr('id')?.replace('thread_', '')
    || id
  
  const kudosText = commentElement.find('.kudos').text()
  const kudosMatch = kudosText.match(/(\d+)/)
  const kudos = kudosMatch ? parseInt(kudosMatch[1], 10) : 0

  return {
    id,
    workId,
    chapterId,
    author,
    authorId,
    isAuthorGuest,
    content,
    posted,
    edited,
    parentId,
    threadId,
    depth: 0,
    kudos,
    replies: []
  }
}

function buildCommentThreads(comments: Comment[]): Comment[] {
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

function parseTotal(headingText: string): number {
  const match = headingText.match(/of\s+([\d,]+)/i)
    || headingText.match(/([\d,]+)\s+Bookmarks?\b/i)
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0
}

function parsePagination($: cheerio.CheerioAPI): { page: number, totalPages: number } {
  const page = parseInt($('.pagination .current').first().text(), 10) || 1
  const pageNumbers = $('.pagination .current, .pagination a')
    .map((i, el) => parseInt($(el).text(), 10))
    .get()
    .filter(Number.isFinite)

  return { page, totalPages: Math.max(page, ...pageNumbers) }
}
