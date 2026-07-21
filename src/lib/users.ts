import { RequestOptions, UserProfile, SearchResults, AO3Error, UserNotFoundError } from "../types/index.js";
import * as cheerio from 'cheerio';
import { parseWorkList } from "./parsers.js";
import { request } from "./request.js";

/**
 * Gets a user's profile
 * @param username The username of the user
 * @param requestOptions Request options
 * @returns A promise that resolves to the user's profile
 */
async function getUserProfile(username: string, requestOptions?: RequestOptions): Promise<UserProfile>{
  const encodedUsername = encodeURIComponent(username)
  const url = `https://archiveofourown.org/users/${encodedUsername}/profile`
  try {
    const html = await request(url, requestOptions)
    const $ = cheerio.load(html)

    const meta = $('dl.meta')

    const getMetaText = (label: string) => meta.find(`dt:contains("${label}")`).next('dd').text().trim()
    const bio = $('.bio.module .userstuff')

    return {
      username: $('h2.heading').text().trim(),
      userId: getMetaText('My user ID is:'),
      joined: getMetaText('I joined on:'),
      bioHtml: bio.length > 0 ? bio.html() : null
    }
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new UserNotFoundError(username)
    }

    throw error
  }
}

/**
 * Gets a paginated list of a user's works
 * @param username The username of the user
 * @param page The page number to fetch
 * @param requestOptions Request options
 * @returns A promise that resolves to a paginated list of works
 */
async function getUserWorks(username: string, page: number = 1, requestOptions?: RequestOptions): Promise<SearchResults> {
  const encodedUsername = encodeURIComponent(username)
  const url = `https://archiveofourown.org/users/${encodedUsername}/works?page=${page}`
  try {
    const html = await request(url, requestOptions)

    return parseWorkList(html)
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw new UserNotFoundError(username)
    }

    throw error
  }
}

export { getUserProfile, getUserWorks }
