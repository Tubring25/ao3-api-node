import { UserProfile } from "../types/index.js";
import { gotScraping } from "got-scraping";
import * as cheerio from 'cheerio';
import { SearchResults } from "../types/index.js";
import { parseWorkList } from "./parsers.js";

/**
 * Gets a user's profile
 * @param username The username of the user
 * @param requestOptions Request options
 * @returns A promise that resolves to the user's profile
 */
async function getUserProfile(username: string, requestOptions?: {proxyUrl?: string}): Promise<UserProfile>{
  const encodedUsername = encodeURIComponent(username)
  const url = `https://archiveofourown.org/users/${encodedUsername}/profile`

  const response = await gotScraping({url, proxyUrl: requestOptions?.proxyUrl})

  if(response.statusCode !== 200) {
    throw new Error(`Failed to fetch user profile for ${username}. Status: ${response.statusCode}`)
  }

  const html = response.body
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
}

/**
 * Gets a paginated list of a user's works
 * @param username The username of the user
 * @param page The page number to fetch
 * @param requestOptions Request options
 * @returns A promise that resolves to a paginated list of works
 */
async function getUserWorks(username: string, page: number = 1, requestOptions?: {proxyUrl?: string}): Promise<SearchResults> {
  const encodedUsername = encodeURIComponent(username)
  const url = `https://archiveofourown.org/users/${encodedUsername}/works?page=${page}`

  const response = await gotScraping({url, proxyUrl: requestOptions?.proxyUrl})

  if(response.statusCode !== 200) {
    throw new Error(`Failed to fetch user works for ${username}. Status: ${response.statusCode}`)
  }

  return parseWorkList(response.body)
}

export { getUserProfile, getUserWorks }