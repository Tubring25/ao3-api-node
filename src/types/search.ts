import { Category, Rating, Warning, WorkSearchResult } from "./work.js";

/**
 * Available sort columns for search results
 */
export type SortColumn = 
  | 'Best Match'
  | 'Author'
  | 'Title'
  | 'Date Posted'
  | 'Date Updated'
  | 'Word Count'
  | 'Hits'
  | 'Kudos'
  | 'Comments'
  | 'Bookmarks'

/**
 * Sort direction for search results
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Comprehensive search options
 */
export interface SearchOptions {
  query?: string;
  title?: string;
  creators?: string;
  revisedAt?: string; // e.g., "< 2 weeks"
  complete?: boolean;
  singleChapter?: boolean;
  wordCount?: string;
  language?: string;
  fandoms?: string[];
  ratings?: Rating[];
  warnings?: Warning[];
  categories?: Category[];
  characters?: string[];
  relationships?: string[];
  freeforms?: string[]; // Additional Tags
  hits?: string;
  kudos?: string;
  comments?: string;
  bookmarks?: string;
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
}

/**
 * Search results
 */
export interface SearchResults {
  works: WorkSearchResult[]
  totalResults: number
}