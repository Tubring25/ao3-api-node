import { describe, vi, expect, afterEach, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { getUserProfile } from "./index";

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: {url: string, proxyUrl?: string}) => {
    if(options.url.includes('/users/TheHomelyBadger')) {
      const mockHtmlPath = path.join(__dirname, 'fixtures', 'user-TheHomelyBadger-profile.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return { statusCode: 200, body: mockHtml }
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

  it('should throw an error for an invalid user', async () => {
    await expect(getUserProfile('InvalidUser')).rejects.toThrow()
  })
})