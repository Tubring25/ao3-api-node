# ao3-api-nodejs

An unofficial, typed client for reading public data from [Archive of Our Own (AO3)](https://archiveofourown.org), written in TypeScript for Node.js.

AO3 has no official API, so this package fetches AO3 pages and parses the HTML into plain objects. Inspired by [ao3_api](https://github.com/wendytg/ao3_api) for Python.

- Works, chapters, chapter text and download links
- Work search and tag listings with AO3's filters
- Series, collections, tags, user profiles and user works
- Public bookmarks and threaded comments
- Typed results, typed errors, timeouts, cancellation and optional proxy support

> [!IMPORTANT]
> This project is not affiliated with the Organization for Transformative Works. Follow AO3's [Terms of Service](https://archiveofourown.org/tos), keep request volume low, and wait between requests. Sending too many requests can get your IP blocked.

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
  - [Request Options](#request-options)
  - [Pagination](#pagination)
  - [Error Handling](#error-handling)
  - [What Is Not Supported](#what-is-not-supported)
- [API Reference](#api-reference)
  - [Works](#works)
  - [Search and Tag Listings](#search-and-tag-listings)
  - [Series](#series)
  - [Collections](#collections)
  - [Tags](#tags)
  - [Users](#users)
  - [Bookmarks](#bookmarks)
  - [Comments](#comments)
- [Example: Export Public Bookmarks](#example-export-public-bookmarks)
- [Development](#development)
- [License](#license)

## Installation

Requires Node.js 20.18.1 or later. The package is ESM-only, so use `import`, not `require`.

```bash
npm install ao3-api-nodejs
# or
pnpm add ao3-api-nodejs
```

## Quick Start

```typescript
import { getWork } from 'ao3-api-nodejs'

const work = await getWork('35961484')

console.log(work.title)
console.log(work.author)        // first author
console.log(work.stats.words)
console.log(work.tags.rating)   // 'Teen And Up Audiences'
```

All IDs are passed as strings: the number in a work URL such as `https://archiveofourown.org/works/35961484` is the work ID.

## Usage Guide

### Request Options

Every API function accepts an optional `RequestOptions` object as its last argument.

| Option | Type | Description |
| --- | --- | --- |
| `timeoutMs` | `number` | Timeout for each request attempt, in milliseconds. |
| `signal` | `AbortSignal` | Cancels an in-flight request. |
| `proxyUrl` | `string` | HTTP proxy URL. Read it from an environment variable rather than hard-coding credentials. |

```typescript
import { getWork } from 'ao3-api-nodejs'

const work = await getWork('35961484', {
  timeoutMs: 30_000,
  signal: AbortSignal.timeout(60_000),
  proxyUrl: process.env.AO3_PROXY_URL
})
```

Requests that fail with a transient HTTP status (such as 429 or 503) are retried up to two times.

### Pagination

Listing functions take a 1-based `page` argument and return the current `page` and `totalPages` alongside the results:

| Function | Result type | Items | Total count |
| --- | --- | --- | --- |
| `search`, `getTagWorks`, `getCollectionWorks`, `getUserWorks` | `SearchResults` | `works` | `totalResults` |
| `getUserBookmarks`, `getWorkBookmarks` | `BookmarkResults` | `bookmarks` | `total` |
| `getWorkComments`, `getChapterComments` | `CommentResults` | `comments` | `total` |

To read several pages, use `iteratePages(fetchPage, { startPage?, maxPages? })`. It requests pages one at a time and stops after the last page or after `maxPages` pages. It does **not** wait between requests, so add a delay yourself:

```typescript
import { setTimeout as delay } from 'node:timers/promises'
import { getUserWorks, iteratePages } from 'ao3-api-nodejs'

const signal = AbortSignal.timeout(120_000)

for await (const result of iteratePages(async page => {
  if (page > 1) await delay(3000, undefined, { signal })
  return getUserWorks('TheHomelyBadger', page, { timeoutMs: 30_000, signal })
}, { maxPages: 5 })) {
  console.log(`Page ${result.page}/${result.totalPages}:`, result.works.length, 'works')
}
```

The 3-second delay is an example, not a guaranteed safe rate. Avoid running several crawls at once or repeatedly restarting a failed one.

### Error Handling

All errors raised by this package extend `AO3Error`, which carries an optional `statusCode`.

| Error | Thrown when |
| --- | --- |
| `WorkNotFoundError` | The work does not exist (404). |
| `ChapterNotFoundError` | The chapter does not exist (404). |
| `UserNotFoundError` | The user does not exist (404). |
| `SeriesNotFoundError` | The series does not exist (404). |
| `CollectionNotFoundError` | The collection does not exist (404). |
| `TagNotFoundError` | The tag does not exist (404). |
| `AuthenticationRequiredError` | The work or its comments are only visible to logged-in users. |
| `AO3Error` | Any other non-200 response, or a page that does not have the expected structure. |

A page that is valid but empty (for example, a user with no works) returns an empty list rather than throwing. Network, timeout and cancellation errors are not wrapped; they keep their original types.

```typescript
import {
  getWork,
  AO3Error,
  AuthenticationRequiredError,
  WorkNotFoundError
} from 'ao3-api-nodejs'

try {
  const work = await getWork('35961484')
  console.log(work.title)
} catch (error) {
  if (error instanceof WorkNotFoundError) {
    console.error('Work not found.')
  } else if (error instanceof AuthenticationRequiredError) {
    console.error('This work requires login.')
  } else if (error instanceof AO3Error) {
    console.error(error.message, error.statusCode)
  } else {
    throw error // network, timeout or abort error
  }
}
```

### What Is Not Supported

- Logging in, cookies, or any content restricted to registered users. Such works throw `AuthenticationRequiredError`.
- Private bookmarks.
- Writing to AO3 (posting, kudos, commenting, bookmarking).

Adult-rated works that are publicly visible are supported; the AO3 adult-content confirmation is skipped automatically.

## API Reference

Signatures below omit the trailing `requestOptions?: RequestOptions` parameter, which every function accepts. All types are exported from the package root.

| Function | Returns | Description |
| --- | --- | --- |
| [`getWork(workId)`](#getwork) | `Work` | Metadata, stats and tags of a work |
| [`getChapters(workId)`](#getchapters) | `Chapter[]` | Chapter IDs and titles |
| [`getChapterContent(workId, chapterId)`](#getchaptercontent) | `ChapterContent` | Text and notes of a chapter |
| [`getWorkDownloadLinks(workId)`](#getworkdownloadlinks) | `WorkDownloadLink[]` | Download URLs (EPUB, PDF, ...) |
| [`search(options)`](#search) | `SearchResults` | Full work search |
| [`getTagWorks(tag, page?, options?)`](#gettagworks) | `SearchResults` | Works listed under a tag |
| [`getSeries(seriesId)`](#getseries) | `Series` | Series details and its works |
| [`getCollection(name)`](#getcollection) | `Collection` | Collection details |
| [`getCollectionWorks(name, page?)`](#getcollectionworks) | `SearchResults` | Works in a collection |
| [`getTag(tag)`](#gettag) | `TagDetails` | Tag category, synonyms and related tags |
| [`getUserProfile(username)`](#getuserprofile) | `UserProfile` | Public profile |
| [`getUserWorks(username, page?)`](#getuserworks) | `SearchResults` | Works by a user |
| [`getUserBookmarks(username, page?)`](#getuserbookmarks) | `BookmarkResults` | A user's public bookmarks |
| [`getWorkBookmarks(workId, page?)`](#getworkbookmarks) | `BookmarkResults` | Public bookmarks of a work |
| [`getWorkComments(workId, page?)`](#getworkcomments) | `CommentResults` | One page of a work's comments |
| [`getChapterComments(workId, chapterId, page?)`](#getchaptercomments) | `CommentResults` | One page of a chapter's comments |
| [`getAllWorkComments(workId)`](#getallworkcomments) | `AllCommentResults` | Every comment on a work |
| [`iteratePages(fetchPage, options?)`](#pagination) | `AsyncGenerator` | Sequential page iterator |

Fields that hold HTML are noted below; all other text fields are plain strings.

### Works

#### `getWork`

```typescript
getWork(workId: string): Promise<Work>
```

Returns a work's metadata, stats and tags.

- `author` is the first author; `authors` lists all authors in page order.
- `summary` is an HTML string.
- `series` lists each series the work belongs to (`id`, `title`, `position`); empty if none.
- `collections` lists each collection (`name`, `title`); empty if none.
- `stats.chapters.total` is `null` when AO3 shows the total as `?`.

```typescript
const work = await getWork('35961484')
console.log(work.tags.fandoms, work.stats.kudos)
```

#### `getChapters`

```typescript
getChapters(workId: string): Promise<Chapter[]>
```

Returns `{ id, title }` for each chapter. A single-chapter work returns one entry whose `id` is the work ID; pass that ID unchanged to `getChapterContent`.

```typescript
const chapters = await getChapters('35961484')
console.log(chapters[0]) // { id: '89650822', title: 'Chapter 1' }
```

#### `getChapterContent`

```typescript
getChapterContent(workId: string, chapterId: string): Promise<ChapterContent>
```

Returns the chapter's `title`, `summary`, `notes`, `content` and `endNotes`. `content` and the notes are HTML strings; missing notes are `null`.

The same code works for single-chapter and multi-chapter works:

```typescript
import { getChapters, getChapterContent } from 'ao3-api-nodejs'

const workId = '57038482'
const [firstChapter] = await getChapters(workId)
const chapter = await getChapterContent(workId, firstChapter.id)
console.log(chapter.title)
console.log(chapter.content) // '<p>...</p>'
```

#### `getWorkDownloadLinks`

```typescript
getWorkDownloadLinks(workId: string): Promise<WorkDownloadLink[]>
```

Returns absolute download URLs for the formats AO3 offers (`AZW3`, `EPUB`, `MOBI`, `PDF`, `HTML`). URLs include AO3's `updated_at` query parameter.

```typescript
const links = await getWorkDownloadLinks('35961484')
const epub = links.find(link => link.format === 'EPUB')
console.log(epub?.url) // 'https://archiveofourown.org/downloads/...'
```

### Search and Tag Listings

#### `search`

```typescript
search(options: SearchOptions): Promise<SearchResults>
```

Searches works with the same fields as AO3's [advanced search](https://archiveofourown.org/works/search). All options are optional:

| Group | Options |
| --- | --- |
| Text | `query`, `title`, `creators` |
| Tags | `fandoms`, `characters`, `relationships`, `freeforms` (additional tags) |
| Classification | `rating`, `warnings`, `categories`, `crossover` (`'include'`, `'exclude'`, `'only'`) |
| Status | `complete`, `singleChapter`, `revisedAt` (e.g. `'< 2 weeks'`), `language` |
| Ranges (AO3 syntax, e.g. `'>1000'`) | `wordCount`, `hits`, `kudos`, `comments`, `bookmarks` |
| Sorting and paging | `sortColumn`, `sortDirection` (`'asc'`, `'desc'`), `page` |

```typescript
import { search } from 'ao3-api-nodejs'

const results = await search({
  query: 'coffee shop au',
  fandoms: ['Arcane: League of Legends (Cartoon 2021)'],
  rating: 'Teen And Up Audiences',
  complete: true,
  crossover: 'exclude',
  sortColumn: 'Kudos',
  page: 1
})

console.log(`Page ${results.page} of ${results.totalPages}, ${results.totalResults} works`)
console.log(results.works[0]?.title)
```

#### `getTagWorks`

```typescript
getTagWorks(tag: string, page?: number, options?: TagWorksOptions): Promise<SearchResults>
```

Lists works under a tag, using the filters from the sidebar of an AO3 tag page: `query`, `complete`, `wordsFrom`, `wordsTo`, `dateFrom`, `dateTo`, `language`, `otherTags`, `ratings`, `warnings`, `categories` and `sortColumn` (any `SortColumn` except `'Best Match'`).

```typescript
import { getTagWorks } from 'ao3-api-nodejs'

const results = await getTagWorks('Top Caitlyn (League of Legends)', 1, {
  complete: true,
  wordsFrom: 1000,
  otherTags: ['Fluff'],
  ratings: ['Teen And Up Audiences'],
  sortColumn: 'Kudos'
})

console.log(`${results.totalResults} works across ${results.totalPages} pages`)
```

### Series

#### `getSeries`

```typescript
getSeries(seriesId: string): Promise<Series>
```

Returns the series title, authors, `description` and `notes`, stats, and the works it contains.

```typescript
const series = await getSeries('2662264')
console.log(series.title)        // 'Roommates AU'
console.log(series.stats.works)  // 3
```

### Collections

#### `getCollection`

```typescript
getCollection(name: string): Promise<Collection>
```

`name` is the collection's short name from its URL (`/collections/<name>`). Returns the title, `descriptionHtml`, status flags (`closed`, `moderated`, `unrevealed`, `anonymous`), `challengeType` (`'GiftExchange'`, `'PromptMeme'` or `null`), `workCount` and `bookmarkCount`.

```typescript
const collection = await getCollection('CaitlynKiramman_Violet')
console.log(collection.workCount) // 8
```

#### `getCollectionWorks`

```typescript
getCollectionWorks(name: string, page?: number): Promise<SearchResults>
```

```typescript
const results = await getCollectionWorks('CaitlynKiramman_Violet')
console.log(results.totalResults) // 8
```

### Tags

#### `getTag`

```typescript
getTag(tag: string): Promise<TagDetails>
```

Returns a tag's `category`, whether it is `canonical` or `adult`, and its related tags:

| Field | Meaning |
| --- | --- |
| `synonymOf` | The canonical tag this tag is merged into, or `null`. |
| `synonyms` | Tags merged into this canonical tag. |
| `parents`, `children` | Parent and child tags (for example, fandom → character). |
| `metaTags`, `subTags` | Meta and sub tags, as flat lists (the tree structure is not kept). |
| `childrenTruncated` | `true` when AO3 indicates there are more child tags than the page shows. |

Related-tag lists contain only what the AO3 tag page currently displays.

```typescript
const tag = await getTag('Fluff')
console.log(tag.category)  // 'Additional Tags'
console.log(tag.canonical) // true
```

### Users

#### `getUserProfile`

```typescript
getUserProfile(username: string): Promise<UserProfile>
```

Returns `username`, `userId`, `joined` and `bioHtml` (`null` if the user has no bio).

```typescript
const profile = await getUserProfile('TheHomelyBadger')
console.log(profile.joined) // '2016-09-16'
```

#### `getUserWorks`

```typescript
getUserWorks(username: string, page?: number): Promise<SearchResults>
```

```typescript
const results = await getUserWorks('TheHomelyBadger')
console.log(`${results.totalResults} works`)
```

### Bookmarks

Each bookmark result has two parts:

- `bookmark` — what the bookmarker added: `tags`, `notes`, `created` (bookmark date), `rec`, plus the bookmarked `workId` and `workTitle`. `id` is `null` when AO3 does not expose it.
- `work` — the bookmarked work's own metadata and stats. `work.author` is the first author; `work.authors` lists all of them.

Bookmarks of series, external works, and deleted or hidden works have no work ID; their `bookmark.workId` is an empty string.

#### `getUserBookmarks`

```typescript
getUserBookmarks(username: string, page?: number): Promise<BookmarkResults>
```

```typescript
const results = await getUserBookmarks('TheHomelyBadger')
for (const { bookmark, work } of results.bookmarks) {
  console.log(bookmark.workTitle, work.words, bookmark.tags)
}
```

#### `getWorkBookmarks`

```typescript
getWorkBookmarks(workId: string, page?: number): Promise<BookmarkResults>
```

Returns the public bookmarks other users have made of a work.

### Comments

Comments are returned as threads: top-level comments are in `comments`, and each comment's replies are nested in `replies`. Each comment has `author`, `content` (HTML), `posted`, `depth`, `threadId` and, for replies, `parentId`.

Comments on works that require login throw `AuthenticationRequiredError`.

#### `getWorkComments`

```typescript
getWorkComments(workId: string, page?: number): Promise<CommentResults>
```

Returns one page of comments across all chapters of a work.

```typescript
const { comments, totalPages } = await getWorkComments('35961484')
for (const comment of comments) {
  console.log(comment.author, comment.replies.length, 'replies')
}
```

#### `getChapterComments`

```typescript
getChapterComments(workId: string, chapterId: string, page?: number): Promise<CommentResults>
```

Returns one page of comments for a single chapter.

#### `getAllWorkComments`

```typescript
getAllWorkComments(workId: string): Promise<AllCommentResults>
```

Fetches every comment page of a work and merges them into one thread tree.

> [!CAUTION]
> This makes one request per comment page, with no delay between them. Avoid it for works with many comment pages; use `getWorkComments` with `iteratePages` and a delay instead.

## Example: Export Public Bookmarks

[`examples/export-bookmarks.mjs`](examples/export-bookmarks.mjs) exports a user's public bookmarks to JSON or CSV. Run it from a checkout of this repository:

```bash
pnpm install
pnpm run build
node examples/export-bookmarks.mjs <username> <output.json|output.csv> [maxPages=10] [delayMs=3000]

# e.g.
node examples/export-bookmarks.mjs TheHomelyBadger bookmarks.csv 5 3000
```

- The output file is written only after all pages are fetched, and an existing file is never overwritten.
- Press Ctrl+C to cancel.
- **JSON** contains every available bookmark and work field, plus page counts and a `truncated` flag.
- **CSV** contains bookmark ID, work ID, title, first author, work URL, bookmark date, notes and the bookmarker's tags. Cells that a spreadsheet could read as formulas are prefixed with an apostrophe.
- Only AO3 works are exported. Series, external works and unavailable items are skipped and counted.

## Development

```bash
pnpm install           # install dependencies
pnpm run build         # compile to dist/
pnpm exec vitest run   # run all tests once
pnpm test              # run tests in watch mode
pnpm run test:coverage # write a coverage report to coverage/
```

Tests run against saved AO3 pages in `src/fixtures/` with mocked requests, so they do not contact AO3. See [AGENTS.md](AGENTS.md) for the project layout and contribution guidelines.

## License

[MIT](LICENSE)
