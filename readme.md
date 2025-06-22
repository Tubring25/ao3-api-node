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
    - [`getWorksByTag`](#getworksbytag)
  - [Series](#series)
    - [`getSeries`](#getseries)
  - [Users](#users)
    - [`getUserProfile`](#getuserprofile)
    - [`getUserWorks`](#getuserworks)
- [License](#license)

## Installation

```bash
npm i ao3-api-nodejs
```
## Quick Start
Here is how to quickly fetch the details of a a work:
```typescript
import { getWork } from 'ao3-api';

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

### `getChapterContent`
Get the meta data and content for a single chapter.

**Signature:** `getChapterContent(workId: string, chapterId: string, options?: { proxyUrl?: string }): Promise<ChapterContent>`

**Example:**
```typescript
import { getChapterContent } from 'ao3-api-nodejs'
const content = await getChapterContent(workId, chapterId)
console.log(content.notes) // '<p>Probably not the sequel you were expecting, sorry :)</p>'
```

### Search
---
#### `search`
Accept the same query parameters as the AO3 website.

**Signature:** `search(options: SearchOptions, requestOptions?: { proxyUrl?: string }): Promise<SearchResults>`

**Example:**
```typescript
import { search } from 'ao3-api';

const results = await search({
  query: 'coffee shop au',
  fandoms: ['Arcane: League of Legends (Cartoon 2021)'],
  ratings: ['Teen And Up Audiences'],
  complete: true,
  sortColumn: 'kudos_count'
});

console.log(`First result: ${results.works[0].title} by ${results.works[0].author}`); // Piltover's Finest (cup of coffee) by SunsetSharkbite
```

#### `getWorksByTag`
Get a paginated list of works for a specific tag.

**Signature:** `getTagWorks(tag: string, page: number = 1, options?: SearchOptions, requestOptions?: { proxyUrl?: string }): Promise<SearchResults>`

**Example:**
```typescript
import { getTagWorks } from 'ao3-api';

const results = await getTagWorks('CaitlynTop', 1);
console.log(`Found ${results.totalResults} works with this tag.`);
```

### Series
---
#### `getSeries`
Get details for a series, including the description, stats, and a list of containing works.

**Signature:** `getSeries(seriesId: string, requestOptions?: { proxyUrl?: string }): Promise<Series>`

**Example:**
```typescript
import { getSeries } from 'ao3-api';

const series = await getSeries('2662264');
console.log(series.title); // 'Roommates AU'
console.log(`This series has ${series.stats.works} works.`); // This series has 3 works.
```

### User
---

#### `getUserProfile`
Get the public profile info of a specific user.

**Signature:** `getUserProfile(username: string, requestOptions?: { proxyUrl?: string }): Promise<UserProfile>`

**Example:**
```typescript
import { getUserProfile } from 'ao3-api';

const profile = await getUserProfile('TheHomelyBadger');
console.log(`${profile.username} joined on ${profile.joined}.`); // 2016-09-16
```

#### `getUserWorks`
Get a paginated list of works published by a user.

**Signature:** `getUserWorks(username: string, page: number = 1, requestOptions?: { proxyUrl?: string }): Promise<SearchResults>`

**Example:**
```typescript
import { getUserWorks } from 'ao3-api';

const results = await getUserWorks('TheHomelyBadger');
console.log(`Found ${results.totalResults} works by TheHomelyBadger.`); // Found 49 works by TheHomelyBadger.
```

## License
MIT