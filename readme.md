# AO3 API for Node.js

## What is this?
This is an unofficial API client for accessing data from Archive of Our Own (AO3). Written in TypeScript and designed for Node.js.

Inspired by [ao3_api](https://github.com/wendytg/ao3_api).

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Works](#works)
    - [`getWork`](#getwork)
    - [`getChapters`](#getchapters)
    - [`getChapterContent`](#getchaptercontent)
  - [Searching](#searching)
    - [`search`](#search)
    - [`getTagWorks`](#gettagworks)
  - [Series](#series)
    - [`getSeries`](#getseries)
  - [Users](#users)
    - [`getUserProfile`](#getuserprofile)
    - [`getUserWorks`](#getuserworks)
  - [Bookmarks](#bookmarks)
    - [`getUserBookmarks`](#getuserbookmarks)
    - [`getWorkBookmarks`](#getworkbookmarks)
  - [Comments](#comments)
    - [`getWorkComments`](#getworkcomments)
    - [`getChapterComments`](#getchaptercomments)
  - [Errors](#errors)
- [License](#license)

## Installation

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

## API Reference
### Works

---
#### `getWork`
Get the full meta data for a single work.

**Signature:** `getWork(workId: string, options?: { proxyUrl?: string }): Promise<Work>`

**Example:**
```typescript
import { getWork } from 'ao3-api-nodejs'
const work = await getWork(workId)
console.log(work.tags.rating); // 'Teen And Up Audiences'
```

#### `getChapters`
Get the list of chapters info for a work. If the work has only one chapter, it returns a single row representing the work itself.

**Signature:** `getChapters(workId: string, options?: { proxyUrl?: string }): Promise<Chapter[]>`

**Example:**
```typescript
import { getChapters } from 'ao3-api-nodejs'
const chaptersList = await getChapters(workId)
console.log(chaptersList[0]) // { id: '89650822', title: 'Chapter 1' }
```

#### `getChapterContent`
Get the meta data and content for a single chapter.

**Signature:** `getChapterContent(workId: string, chapterId: string, options?: { proxyUrl?: string }): Promise<ChapterContent>`

**Example:**
```typescript
import { getChapterContent } from 'ao3-api-nodejs'
const content = await getChapterContent(workId, chapterId)
console.log(content.notes) // '<p>Probably not the sequel you were expecting, sorry :)</p>'
```

### Searching
---
#### `search`
Accept the same query parameters as the AO3 website.

**Signature:** `search(options: SearchOptions, requestOptions?: { proxyUrl?: string }): Promise<SearchResults>`

**Example:**
```typescript
import { search } from 'ao3-api-nodejs';

const results = await search({
  page: 2,
  query: 'coffee shop au',
  fandoms: ['Arcane: League of Legends (Cartoon 2021)'],
  ratings: ['Teen And Up Audiences'],
  complete: true,
  sortColumn: 'Kudos'
});

console.log(`Page ${results.page} of ${results.totalPages}`);
console.log(`First result: ${results.works[0].title} by ${results.works[0].author}`);
```

#### `getTagWorks`
Get a paginated list of works for a specific tag.

**Signature:** `getTagWorks(tag: string, page: number = 1, options?: TagWorksOptions, requestOptions?: { proxyUrl?: string }): Promise<SearchResults>`

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

**Signature:** `getSeries(seriesId: string, requestOptions?: { proxyUrl?: string }): Promise<Series>`

**Example:**
```typescript
import { getSeries } from 'ao3-api-nodejs';

const series = await getSeries('2662264');
console.log(series.title); // 'Roommates AU'
console.log(`This series has ${series.stats.works} works.`); // This series has 3 works.
```

### Users
---

#### `getUserProfile`
Get the public profile info of a specific user.

**Signature:** `getUserProfile(username: string, requestOptions?: { proxyUrl?: string }): Promise<UserProfile>`

**Example:**
```typescript
import { getUserProfile } from 'ao3-api-nodejs';

const profile = await getUserProfile('TheHomelyBadger');
console.log(`${profile.username} joined on ${profile.joined}.`); // 2016-09-16
```

#### `getUserWorks`
Get a paginated list of works published by a user.

**Signature:** `getUserWorks(username: string, page: number = 1, requestOptions?: { proxyUrl?: string }): Promise<SearchResults>`

**Example:**
```typescript
import { getUserWorks } from 'ao3-api-nodejs';

const results = await getUserWorks('TheHomelyBadger');
console.log(`Found ${results.totalResults} works by TheHomelyBadger.`); // Found 49 works by TheHomelyBadger.
```

### Bookmarks

#### `getUserBookmarks`
Get a paginated list of a user's public bookmarks.

**Signature:** `getUserBookmarks(username: string, page: number = 1, proxyUrl?: string): Promise<BookmarkResults>`

```typescript
import { getUserBookmarks } from 'ao3-api-nodejs'

const results = await getUserBookmarks('TheHomelyBadger')
console.log(results.bookmarks[0].bookmark.workTitle)
```

#### `getWorkBookmarks`
Get the public bookmarks for a work. `bookmark.id` is `null` when AO3 does not expose an ID.

**Signature:** `getWorkBookmarks(workId: string, page: number = 1, proxyUrl?: string): Promise<BookmarkResults>`

### Comments

#### `getWorkComments`
Get paginated comments for a complete work, organized into reply threads.

**Signature:** `getWorkComments(workId: string, page: number = 1, proxyUrl?: string): Promise<CommentResults>`

#### `getChapterComments`
Get paginated comments for one chapter, organized into reply threads.

**Signature:** `getChapterComments(workId: string, chapterId: string, page: number = 1, proxyUrl?: string): Promise<CommentResults>`

### Errors

HTTP response failures use `AO3Error` and include a `statusCode`. Bookmark and comment helpers use `WorkNotFoundError`, `UserNotFoundError`, or `ChapterNotFoundError` for missing resources.

## License
MIT
