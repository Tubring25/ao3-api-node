/**
 * Common request options for API calls
 */
export interface RequestOptions {
  proxyUrl?: string;
}

/**
 * Base error class for AO3 API errors
 */
export class AO3Error extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'AO3Error'
  }
}

/**
 * Error thrown when a work is not found
 */
export class WorkNotFoundError extends AO3Error {
  constructor(workId: string) {
    super(`Work ${workId} not found`, 404)
    this.name = 'WorkNotFoundError'
  }
}

/**
 * Error thrown when a chapter is not found
 */
export class ChapterNotFoundError extends AO3Error {
  constructor(workId: string, chapterId: string) {
    super(`Chapter ${chapterId} not found for work ${workId}`, 404)
    this.name = 'ChapterNotFoundError'
  }
}

/**
 * Error thrown when a user is not found
 */
export class UserNotFoundError extends AO3Error {
  constructor(username: string) {
    super(`User ${username} not found`, 404)
    this.name = 'UserNotFoundError'
  }
}

/**
 * Error thrown when a series is not found
 */
export class SeriesNotFoundError extends AO3Error {
  constructor(seriesId: string) {
    super(`Series ${seriesId} not found`, 404)
    this.name = 'SeriesNotFoundError'
  }
}
