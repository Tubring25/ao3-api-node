
import { gotScraping } from "got-scraping";
import { AO3Error } from "../types/index.js";

export async function request(url: string, proxyUrl?: string) {
  const response = await gotScraping({
    url: url,
    proxyUrl: proxyUrl,
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
