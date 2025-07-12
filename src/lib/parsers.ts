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

  return { works, totalResults }
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
  
  let total = 0
  const headingText = $('h2.heading').text().trim()
  const match = headingText.match(/of ([\d,]+)/)
  if (match && match[1]) {
    total = parseInt(match[1].replace(/,/g, ''), 10)
  }

  const bookmarks: BookmarkSearchResult[] = $('ol.bookmark li.bookmark')
    .map((i, el) => parseBookmarkBlurb(el, $))
    .get()

  const currentPage = parseInt($('.pagination .current').text() || '1', 10)
  const lastPageLink = $('.pagination a').last()
  const totalPages = parseInt(lastPageLink.text() || '1', 10)

  return { 
    bookmarks, 
    total, 
    page: currentPage, 
    totalPages 
  }
}

function parseBookmarkBlurb(
  // @ts-expect-error - Element is not exported from cheerio
  element: cheerio.Element,
  $: cheerio.CheerioAPI
): BookmarkSearchResult {
  const bookmarkElement = $(element)
  
  const bookmarkId = bookmarkElement.attr('id')?.replace('bookmark_', '') || ''
  const workLink = bookmarkElement.find('h4.heading a').first()
  const workId = workLink.attr('href')?.match(/\/works\/(\d+)/)?.[1] || ''
  const workTitle = workLink.text().trim()
  const workAuthor = bookmarkElement.find('a[rel="author"]').text().trim()
  
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

  const parseStat = (className: string): number => {
    const text = bookmarkElement.find(`dd.${className}`).text().replace(/,/g, '')
    return parseInt(text, 10) || 0
  }

  const chapterText = bookmarkElement.find('dd.chapters').text().trim()
  const chapterMatch = chapterText.match(/(\d+)\/(\d+|\?)/)
  const chapters = {
    posted: chapterMatch ? parseInt(chapterMatch[1], 10) : 1,
    total: chapterMatch && chapterMatch[2] !== '?' ? parseInt(chapterMatch[2], 10) : null
  }

  return {
    bookmark: {
      id: bookmarkId,
      workId,
      workTitle,
      workAuthor,
      userId,
      username,
      created,
      notes,
      tags,
      public: isPublic,
      rec: isRec
    },
    work: {
      title: workTitle,
      author: workAuthor,
      summary: bookmarkElement.find('.summary blockquote').text().trim(),
      rating: bookmarkElement.find('.rating .text').text().trim(),
      warnings: bookmarkElement.find('.warnings .text')
        .map((i, el) => $(el).text().trim())
        .get(),
      categories: bookmarkElement.find('.category .text')
        .map((i, el) => $(el).text().trim())
        .get(),
      fandoms: bookmarkElement.find('.fandoms a')
        .map((i, el) => $(el).text().trim())
        .get(),
      relationships: bookmarkElement.find('.relationships a')
        .map((i, el) => $(el).text().trim())
        .get(),
      characters: bookmarkElement.find('.characters a')
        .map((i, el) => $(el).text().trim())
        .get(),
      additionalTags: bookmarkElement.find('.freeforms a')
        .map((i, el) => $(el).text().trim())
        .get(),
      language: bookmarkElement.find('dd.language').text().trim(),
      published: bookmarkElement.find('dd.published').text().trim(),
      updated: bookmarkElement.find('dd.status').text().trim() || null,
      words: parseStat('words'),
      chapters,
      completed: chapterMatch ? chapterMatch[1] === chapterMatch[2] : true,
      kudos: parseStat('kudos'),
      comments: parseStat('comments'),
      bookmarks: parseStat('bookmarks'),
      hits: parseStat('hits')
    }
  }
}

/**
 * Parses the HTML of a comments page
 * @param html The HTML of the comments page
 * @returns {CommentResults} The parsed comments with threading
 */
export function parseCommentList(html: string): CommentResults {
  const $ = cheerio.load(html)
  
  let total = 0
  const headingText = $('h3.heading').text().trim()
  const match = headingText.match(/(\d+) Comments/)
  if (match && match[1]) {
    total = parseInt(match[1], 10)
  }

  const comments: Comment[] = $('.comment')
    .map((i, el) => parseComment(el, $))
    .get()

  const currentPage = parseInt($('.pagination .current').text() || '1', 10)
  const lastPageLink = $('.pagination a').last()
  const totalPages = parseInt(lastPageLink.text() || '1', 10)

  return { 
    comments: buildCommentThreads(comments), 
    total, 
    page: currentPage, 
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
  
  const content = commentElement.find('.comment .userstuff').html() || ''
  const posted = commentElement.find('.datetime').text().trim()
  const edited = commentElement.find('.edited').text().trim() || undefined
  
  const parentElement = commentElement.parent().closest('.comment')
  const parentId = parentElement.length ? parentElement.attr('id')?.replace('comment_', '') : undefined
  
  const threadElement = commentElement.closest('.thread')
  const threadId = threadElement.attr('id')?.replace('thread_', '') || id
  
  const depth = commentElement.parents('.comment').length
  
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
    depth,
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
  
  return rootComments
}