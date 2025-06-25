import { describe, it, expect, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { getUserWorks } from "../index.js";
import { gotScraping } from "got-scraping";

afterEach(async () => {
  vi.clearAllMocks()
})

vi.mock('got-scraping', () => ({
  gotScraping: vi.fn().mockImplementation(async (options: { url: string }) => {
    if (options.url.includes('/users/TheHomelyBadger/works')) {
      const mockHtmlPath = path.join(__dirname, '../fixtures', 'user-TheHomelyBadger-works.html')
      const mockHtml = await fs.readFile(mockHtmlPath, 'utf-8')
      return { statusCode: 200, body: mockHtml }
    }
    return { statusCode: 404, statusMessage: 'Not Found' }
  }),
}))

describe("getUserWorks", () => {
  it("should return a user's works and total work count", async () => {
    const results = await getUserWorks("TheHomelyBadger")
    
    expect(results).toBeDefined()
    expect(results.works.length).toBe(20)
    expect(results.totalResults).toBe(49)

    const firstWork = results.works[0]
    expect(firstWork.id).toBe('66582997')
    expect(firstWork.title).toBe('nervesteel')
  })
  it('should pass the proxyUrl to got-scraping', async () => {
    const proxyUrl = 'http://localhost:8080';
    await getUserWorks('TheHomelyBadger', 1, { proxyUrl });
    expect(gotScraping).toHaveBeenCalledWith({
      url: expect.any(String),
      proxyUrl,
    });
  });
})