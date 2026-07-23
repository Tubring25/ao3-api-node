
import { gotScraping } from "got-scraping";
import { AO3Error, RequestOptions } from "../types/index.js";

export async function request(url: string, options: RequestOptions = {}) {
  const response = await gotScraping({
    url: url,
    proxyUrl: options.proxyUrl,
    timeout: options.timeoutMs !== undefined ? { request: options.timeoutMs } : undefined,
    signal: options.signal,
    retry: {
      limit: 2,
      statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524, 525],
    },
  });

  if (response.statusCode !== 200) {
    throw new AO3Error(
      `Failed to fetch ${url}. Status: ${response.statusCode}`,
      response.statusCode
    );
  }

  return response.body;
}
