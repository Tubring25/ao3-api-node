export interface Bookmark {
  id: string;
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
  work: {
    title: string;
    author: string;
    summary: string;
    rating: string;
    warnings: string[];
    categories: string[];
    fandoms: string[];
    relationships: string[];
    characters: string[];
    additionalTags: string[];
    language: string;
    published: string;
    updated: string | null;
    words: number;
    chapters: {
      posted: number;
      total: number | null;
    };
    completed: boolean;
    kudos: number;
    comments: number;
    bookmarks: number;
    hits: number;
  };
}

export interface BookmarkResults {
  bookmarks: BookmarkSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}