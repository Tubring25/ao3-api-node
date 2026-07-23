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
 * How crossover works are handled.
 */
export type CrossoverMode = 'include' | 'exclude' | 'only'

/**
 * Comprehensive search options
 */
export interface SearchOptions {
  page?: number;
  query?: string;
  title?: string;
  creators?: string;
  revisedAt?: string; // e.g., "< 2 weeks"
  complete?: boolean;
  crossover?: CrossoverMode;
  singleChapter?: boolean;
  wordCount?: string;
  language?: string;
  fandoms?: string[];
  rating?: Rating;
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
 * Filters supported by AO3 tag work listings
 */
export interface TagWorksOptions {
  query?: string;
  complete?: boolean;
  wordsFrom?: number;
  wordsTo?: number;
  dateFrom?: string;
  dateTo?: string;
  language?: string;
  otherTags?: string[];
  ratings?: Rating[];
  warnings?: Warning[];
  categories?: Category[];
  sortColumn?: Exclude<SortColumn, 'Best Match'>;
}

/**
 * Search results
 */
export interface SearchResults {
  works: WorkSearchResult[]
  totalResults: number
  page: number
  totalPages: number
}
