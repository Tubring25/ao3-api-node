import { AO3Error, RequestOptions } from '../types/index.js'
import { request } from './request.js'

/**
 * Fetches an AO3 page, throwing the resource's not-found error for a 404 response.
 * @param url The page URL
 * @param options Request options
 * @param notFound Creates the error to throw when AO3 responds with 404
 * @returns The page HTML
 */
export async function requestResource(
  url: string,
  options: RequestOptions | undefined,
  notFound: () => AO3Error
): Promise<string> {
  try {
    return await request(url, options)
  } catch (error) {
    if (error instanceof AO3Error && error.statusCode === 404) {
      throw notFound()
    }
    throw error
  }
}
