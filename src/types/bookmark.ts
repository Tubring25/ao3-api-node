import type { WorkSearchResult } from './work.js';

export interface Bookmark {
  id: string | null;
  workId: string;
  workTitle: string;
  workAuthor: string;
  userId: string;
  username: string;
  created: string;
  notes: string | null;
  tags: string[];
  public: boolean;
  rec: boolean;
}

export interface BookmarkSearchResult {
  bookmark: Bookmark;
  /** The bookmarked work, in the same shape as search results. */
  work: WorkSearchResult;
}

export interface BookmarkResults {
  bookmarks: BookmarkSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}
