import { describe, vi, expect, afterEach, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { AO3Error, getUserProfile, UserNotFoundError } from "../index.js";
import { gotScraping } from "got-scraping";

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string, proxyUrl?: string}) => {
    if(options.url.includes('/users/TheHomelyBadger')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'user-TheHomelyBadger-profile.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    else if(options.url.includes('/users/NoBio')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'user-TheHomelyBadgerNoBio-profile.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    else if(options.url.includes('/users/InvalidPage')) {
      return { statusCode: 200, body: '<html><body></body></html>' }
    }
    return { statusCode: 404, statusMessage: 'Not Found' }
  })
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('getUserProfile', () => {
  it('should return the profile details for a valid user', async () => {
    const profile = await getUserProfile('TheHomelyBadger')

    expect(profile).toBeDefined()
    expect(profile.username).toBe('TheHomelyBadger')
    expect(profile.userId).toBe('2457241')
    expect(profile.joined).toBe('2016-09-16')
    expect(profile.bioHtml).toContain('https://twitter.com/TheHomelyBadger')
  })

  it('should throw UserNotFoundError for a missing user', async () => {
    await expect(getUserProfile('InvalidUser')).rejects.toBeInstanceOf(UserNotFoundError)
  })

  it('should throw AO3Error for an invalid user profile page', async () => {
    await expect(getUserProfile('InvalidPage')).rejects.toBeInstanceOf(AO3Error)
  })

  it('should return null for the bioHtml when the user has no bio', async () => {
    const profile = await getUserProfile('NoBio')
    expect(profile.bioHtml).toBeNull()
  })

  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080';
    await getUserProfile('TheHomelyBadger', { proxyUrl });
    expect(gotScraping).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.any(String),
      proxyUrl,
    }));
  });
})
