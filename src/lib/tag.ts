import * as cheerio from 'cheerio';

import {
  RequestOptions,
  TagDetails,
  TagCategory,
  AO3Error,
  TagNotFoundError
} from "../types/index.js";
import { request } from './request.js';

/**
 * Get detail info for a tag.
 * @param tag tag name
 * @param requestOption
 * @returns
 */
async function getTag(tag: string, requestOption?: RequestOptions): Promise<TagDetails> {
  const encodedTag = encodeTag(tag);
  const url = `https://archiveofourown.org/tags/${encodedTag}`;

  try {
    const response = await request(url, requestOption);
    const $ = cheerio.load(response);

    if($('#main.tags-show').length === 0 || $('.tag.home.profile').length === 0) {
      throw new AO3Error(`Invalid value for Tag: "${tag}"`);
    }

    const name = $('.tag.home.profile .primary.header h2.heading').first().text().trim()

    const category = $('.tag.home.profile > p').first().text().match(/belongs to the (.+?) Category\b/i)?.[1]?.trim()

    if (!name || !isTagCategory(category)) {
      throw new AO3Error(`Invalid tag page for tag: ${tag}`)
    }
    const synonymOf = $('.merger.module a.tag').text().trim() || null

    const getNonEmptyList = (selector: string) => {
      return $(selector).map((_,el) => $(el).text().trim()).get().filter(Boolean)
    }

    return {
      name,
      category,
      canonical: $('a[href*="#canonicaldef"]').length > 0,
      adult: $('.tag.home.profile > p.warning').length > 0,
      synonymOf,
      synonyms: getNonEmptyList('.synonym.listbox a.tag'),
      parents: getNonEmptyList('.parent.listbox a.tag'),
      metaTags: getNonEmptyList('.meta.listbox a.tag'),
      subTags: getNonEmptyList('.sub.listbox a.tag'),
      children: getNonEmptyList('.child.listbox a.tag'),
      childrenTruncated: $('.child.listbox ul.tags > li')
       .filter((_, element) => $(element).find('a.tag').length === 0)
       .length > 0,
    }

  } catch (error) {
    if(error instanceof AO3Error && error.statusCode === 404) {
      throw new TagNotFoundError(tag);
    }
    throw error;
  }
}

const tagCategories: ReadonlySet<string> = new Set([
  'Rating',
  'Archive Warning',
  'Category',
  'Media',
  'Fandom',
  'Relationship',
  'Character',
  'Additional Tags',
  'Unsorted Tag',
  'Tag'
])

function isTagCategory(
  value: string | undefined
): value is TagCategory {
  return value !== undefined && tagCategories.has(value)
}


const tagReplacements: Record<string, string> = {
  '/': '*s*',
  '&': '*a*',
  '.': '*d*',
  '?': '*q*',
  '#': '*h*'
}

function encodeTag(tag: string): string {
  const esacapedTag = tag.replace(/[\/&.?#]/g, character => {
    return tagReplacements[character]
  })
  return encodeURIComponent(esacapedTag)
}

export { getTag }
