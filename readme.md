# AO3 API for Node.js

## What is this?
This is an unofficial API client for accessing data from Archive of Our Own (AO3). Written in TypeScript and designed for Node.js.

Inspired by [ao3_api](https://github.com/wendytg/ao3_api).

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Request Options and Pagination](#request-options-and-pagination)
- [Export Public Bookmarks](#export-public-bookmarks)
- [API Reference](#api-reference)
  - [Works](#works)
    - [`getWork`](#getwork)
    - [`getChapters`](#getchapters)
    - [`getChapterContent`](#getchaptercontent)
    - [`getWorkDownloadLinks`](#getworkdownloadlinks)
  - [Searching](#searching)
    - [`search`](#search)
    - [`getTagWorks`](#gettagworks)
  - [Series](#series)
    - [`getSeries`](#getseries)
  - [Collections](#collections)
    - [`getCollection`](#getcollection)
    - [`getCollectionWorks`](#getcollectionworks)
  - [Tags](#tags)
    - [`getTag`](#gettag)
  - [Users](#users)
    - [`getUserProfile`](#getuserprofile)
    - [`getUserWorks`](#getuserworks)
  - [Bookmarks](#bookmarks)
    - [`getUserBookmarks`](#getuserbookmarks)
    - [`getWorkBookmarks`](#getworkbookmarks)
  - [Comments](#comments)
    - [`getWorkComments`](#getworkcomments)
    - [`getChapterComments`](#getchaptercomments)
    - [`getAllWorkComments`](#getallworkcomments)
  - [Errors](#errors)
- [License](#license)

## Installation
Node.js 20.18.1 or later is required. This package uses ESM imports.
```bash
npm i ao3-api-nodejs
```
## Quick Start
Here is how to quickly fetch the details of a work:
```typescript
import { getWork } from 'ao3-api-nodejs';

// Use an async IIFE (Immediately Invoked Function Expression) to use await
(async () => {
  try {
    const workId = '35961484';
    const work = await getWork(workId);
    
    console.log(`Title: ${work.title}`);
    console.log(`Author: ${work.author}`);
    console.log(`Words: ${work.stats.words}`);
  } catch (error) {
    console.error(error);
  }
})();
```

## A Note on AO3's Terms of Service

This is an unofficial API and is not affiliated with the Organization for Transformative Works. Please respect the AO3's [Terms of Service](https://archiveofourown.org/tos). To avoid being IP-banned, please do not make an excessive number of requests. It is recommended to introduce a delay between requests.

The package only fetches publicly available data. It does not support authentication, cookies, or authentication-restricted works. Requests for restricted works throw `AuthenticationRequiredError`.

## Request Options and Pagination

All request functions accept `RequestOptions`:

| Option | Purpose |
| --- | --- |
| `proxyUrl` | Optional HTTP proxy URL. Keep credentials outside source code. |
| `timeoutMs` | Timeout in milliseconds for each request attempt. |
| `signal` | An `AbortSignal` for cancelling an in-flight request. |

```typescript
import { getWork, WorkNotFoundError, AuthenticationRequiredError, AO3Error } from 'ao3-api-nodejs'

try {
  const work = await getWork('35961484', {
    timeoutMs: 30_000,
    signal: AbortSignal.timeout(60_000),
    proxyUrl: process.env.AO3_PROXY_URL
  })
  console.log(work.title)
} catch (error) {
  if (error instanceof WorkNotFoundError) console.error('Work not found.')
  else if (error instanceof AuthenticationRequiredError) console.error('This work requires login.')
  else if (error instanceof AO3Error) console.error(error.message, error.statusCode)
  else throw error // Transport, timeout and cancellation errors retain their original types.
}
```

`iteratePages(fetchPage, { startPage?, maxPages? })` fetches pages sequentially and stops at the last page or the supplied page limit. It does not impose a request interval. Add a delay inside the callback when reading multiple pages:

```typescript
import { setTimeout as delay } from 'node:timers/promises'
import { getUserWorks, iteratePages } from 'ao3-api-nodejs'

const signal = AbortSignal.timeout(120_000)
for await (const result of iteratePages(async page => {
  if (page > 1) await delay(3000, undefined, { signal })
  return getUserWorks('TheHomelyBadger', page, { timeoutMs: 30_000, signal })
}, { maxPages: 5 })) {
  console.log(result.works)
}
```

The delay is an example, not a guaranteed safe AO3 request rate. The request layer retries selected transient HTTP failures up to twice. Avoid repeatedly restarting a failed export or running multiple exports concurrently.

## Export Public Bookmarks

From a checkout of this repository:

```bash
pnpm install
pnpm run build
node examples/export-bookmarks.mjs TheHomelyBadger bookmarks.json 10 3000
# Or use bookmarks.csv as the output filename.
```

The [export example](examples/export-bookmarks.mjs) exports public bookmarks of AO3 works. The last two arguments set the page limit (default `10`) and delay between pages in milliseconds (default `3000`). Press Ctrl+C to cancel. Existing output files are never overwritten, and fetching must succeed before an output file is written.

JSON includes the available bookmark and work fields, page counts, and a `truncated` flag. CSV includes bookmark ID, work ID, title, first author, work URL, bookmark date, notes and bookmarker's tags; cells that could be read as formulas are prefixed with an apostrophe. Both formats report when the page limit produces a partial export and how many bookmarks were skipped. Series, external works and unavailable items are skipped because the current model does not provide an AO3 work ID for them. Private bookmarks are not accessible.

## API Reference
### Works

---
#### `getWork`
Get the full meta data for a single work.
`author` contains the first author, while `authors` contains all authors in page order.
`series` contains each series Id, title and position of current work. It is empty if the work doesn't belong to any series.
`collections` contains each collection's unique name and display title. It is empty if the work doesn't belong to any collection.

**Signature:** `getWork(workId: string, requestOptions?: RequestOptions): Promise<Work>`

**Example:**
```typescript
import { getWork } from 'ao3-api-nodejs'
const work = await getWork(workId)
console.log(work.tags.rating); // 'Teen And Up Audiences'
```

#### `getChapters`
Get the list of chapters info for a work. If the work has only one chapter, it returns a single row representing the work itself, with `id` equal to the work ID. Pass that ID unchanged to `getChapterContent`.

**Signature:** `getChapters(workId: string, requestOptions?: RequestOptions): Promise<Chapter[]>`

**Example:**
```typescript
import { getChapters } from 'ao3-api-nodejs'
const chaptersList = await getChapters(workId)
console.log(chaptersList[0]) // { id: '89650822', title: 'Chapter 1' }
```

#### `getChapterContent`
Get the meta data and content for a single chapter.
For standalone works, pass the ID returned by `getChapters`; the result contains the work title, summary, notes, body and end notes. Content and notes are HTML strings.

**Signature:** `getChapterContent(workId: string, chapterId: string, requestOptions?: RequestOptions): Promise<ChapterContent>`

**Example:**
```typescript
import { getChapterContent } from 'ao3-api-nodejs'
const content = await getChapterContent(workId, chapterId)
console.log(content.notes) // '<p>Probably not the sequel you were expecting, sorry :)</p>'
```

The same flow works for standalone and chaptered works:

```typescript
import { getChapters, getChapterContent } from 'ao3-api-nodejs'

const workId = '57038482'
const [chapter] = await getChapters(workId)
const content = await getChapterContent(workId, chapter.id)
console.log(content.title)
```

#### `getWorkDownloadLinks`
Get the available download links for a work. URLs are absolute and include AO3's `updated_at` query parameter.

**Signature:** `getWorkDownloadLinks(workId: string, requestOptions?: RequestOptions): Promise<WorkDownloadLink[]>`

**Example:**
```typescript
import { getWorkDownloadLinks } from 'ao3-api-nodejs'
const links = await getWorkDownloadLinks(workId)
console.log(links[0]) // { format: 'AZW3', url: 'https://archiveofourown.org/downloads/...' }
```

### Searching
---
#### `search`
Accept the same query parameters as the AO3 website.

**Signature:** `search(options: SearchOptions, requestOptions?: RequestOptions): Promise<SearchResults>`

**Example:**
```typescript
import { search } from 'ao3-api-nodejs';

const results = await search({
  page: 2,
  query: 'coffee shop au',
  fandoms: ['Arcane: League of Legends (Cartoon 2021)'],
  rating: 'Teen And Up Audiences',
  complete: true,
  crossover: 'include',
  sortColumn: 'Kudos'
});

console.log(`Page ${results.page} of ${results.totalPages}`);
console.log(`First result: ${results.works[0].title} by ${results.works[0].author}`);
```

#### `getTagWorks`
Get a paginated list of works for a specific tag.

**Signature:** `getTagWorks(tag: string, page: number = 1, options?: TagWorksOptions, requestOptions?: RequestOptions): Promise<SearchResults>`

**Example:**
```typescript
import { getTagWorks } from 'ao3-api-nodejs';

const results = await getTagWorks('Top Caitlyn (League of Legends)', 1, {
  complete: true,
  wordsFrom: 1000,
  otherTags: ['Fluff'],
  ratings: ['Teen And Up Audiences'],
  sortColumn: 'Kudos'
});

console.log(`Found ${results.totalResults} works across ${results.totalPages} pages.`);
```

### Series
---
#### `getSeries`
Get details for a series, including the description, stats, and a list of containing works.

**Signature:** `getSeries(seriesId: string, requestOptions?: RequestOptions): Promise<Series>`

**Example:**
```typescript
import { getSeries } from 'ao3-api-nodejs';

const series = await getSeries('2662264');
console.log(series.title); // 'Roommates AU'
console.log(`This series has ${series.stats.works} works.`); // This series has 3 works.
```

### Collections
---
#### `getCollection`
Get meta data for a collection, including the description status and work count.

**Signature:** `getCollection(name: string, requestOptions?: RequestOptions): Promise<Collection>`

**Example:**
```typescript
import { getCollection } from 'ao3-api-nodejs';

const collection = await getCollection('CaitlynKiramman_Violet');
console.log(collection.workCount) // 8
```

#### `getCollectionWorks`
Get a paginated list of works in a collection.

**Signature:** `getCollectionWorks(name: string, page: number = 1, requestOptions?: RequestOptions): Promise<SearchResults>`

**Example:**
```typescript
import { getCollectionWorks } from 'ao3-api-nodejs';

const searchResults = await getCollectionWorks('CaitlynKiramman_Violet');
console.log(searchResults.totalResults) // 8
```

### Tags
---
#### `getTag`
Get detail info for a tag, including synonyms, parents, and children.
`synonymOf` is the canonical tag that the current tag points to.
`synonyms` are synonym tags merged into the current canonical tag.
`metaTags` and `subTags` are flat arrays, not keeping the tree structure.
Relationship arrays contain only the content currently displayed on the AO3 page. `childrenTruncated` is `true` when AO3 indicates that more child tags exist.

**Signature:** `getTag(tag: string, requestOptions?: RequestOptions): Promise<TagDetails>`

**Example:**
```typescript
import { getTag } from 'ao3-api-nodejs';

const tag = await getTag('Fluff');
console.log(tag.category) // 'Additional Tags'
console.log(tag.canonical) // true
```

### Users
---

#### `getUserProfile`
Get the public profile info of a specific user.

**Signature:** `getUserProfile(username: string, requestOptions?: RequestOptions): Promise<UserProfile>`

**Example:**
```typescript
import { getUserProfile } from 'ao3-api-nodejs';

const profile = await getUserProfile('TheHomelyBadger');
console.log(`${profile.username} joined on ${profile.joined}.`); // 2016-09-16
```

#### `getUserWorks`
Get a paginated list of works published by a user.

**Signature:** `getUserWorks(username: string, page: number = 1, requestOptions?: RequestOptions): Promise<SearchResults>`

**Example:**
```typescript
import { getUserWorks } from 'ao3-api-nodejs';

const results = await getUserWorks('TheHomelyBadger');
console.log(`Found ${results.totalResults} works by TheHomelyBadger.`); // Found 49 works by TheHomelyBadger.
```

### Bookmarks

#### `getUserBookmarks`
Get a paginated list of a user's public bookmarks.
The embedded `work.author` contains the first author, while `work.authors` contains all authors.
`bookmark.tags`, `bookmark.notes` and `bookmark.created` describe the bookmarker's additions and bookmark date, rather than the work's tags or update date.

**Signature:** `getUserBookmarks(username: string, page: number = 1, requestOptions?: RequestOptions): Promise<BookmarkResults>`

```typescript
import { getUserBookmarks } from 'ao3-api-nodejs'

const results = await getUserBookmarks('TheHomelyBadger')
console.log(results.bookmarks[0].bookmark.workTitle)
```

#### `getWorkBookmarks`
Get the public bookmarks for a work. `bookmark.id` is `null` when AO3 does not expose an ID.

**Signature:** `getWorkBookmarks(workId: string, page: number = 1, requestOptions?: RequestOptions): Promise<BookmarkResults>`

### Comments

#### `getWorkComments`
Get paginated comments for a complete work, organized into reply threads.
Public adult works are supported. Login-required works throw `AuthenticationRequiredError`; unexpected pages throw `AO3Error` instead of returning an empty comment list.

**Signature:** `getWorkComments(workId: string, page: number = 1, requestOptions?: RequestOptions): Promise<CommentResults>`

#### `getChapterComments`
Get paginated comments for one chapter, organized into reply threads.

**Signature:** `getChapterComments(workId: string, chapterId: string, page: number = 1, requestOptions?: RequestOptions): Promise<CommentResults>`

#### `getAllWorkComments`
Get all comments for a work.
**Caution:**  This method fetches every comments page sequentially. Avoid calling it frequently for works with many comments.

**Signature:** `getAllWorkComments(workId: string, requestOptions?: RequestOptions): Promise<AllCommentResults>`


### Errors

HTTP response failures use `AO3Error`.
Unexpected work listing, profile, series, user bookmark and comment pages also throw `AO3Error`. Legitimate empty result pages still return empty lists. Network, timeout and cancellation errors retain their original transport error types.
Missing resources use:
- `WorkNotFoundError`
- `UserNotFoundError`
- `ChapterNotFoundError`
- `CollectionNotFoundError`
- `SeriesNotFoundError`
- `TagNotFoundError`

## License
MIT
