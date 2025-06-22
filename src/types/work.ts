/**
 * AO3 content ratings
 */
export type Rating =
  | 'Not Rated'
  | 'General Audiences'
  | 'Teen And Up Audiences'
  | 'Mature'
  | 'Explicit'

/**
 * AO3 content warnings
 */
export type Warning = 
  | 'Creator Chose Not To Use Archive Warnings'
  | 'Graphic Depictions Of Violence'
  | 'Major Character Death'
  | 'No Archive Warnings Apply'
  | "Rape/Non-Con"
  | 'Underage'

/**
 * AO3 relationship categories
 */
export type Category =
  | 'F/F'
  | 'F/M'
  | 'M/M'
  | 'Multi'
  | 'Other'
  | 'Gen'
  | 'Non-Binary'

/**
 * Statistical information about a work
 */
export interface WorkStats {
  published: string;
  updated?: string;
  words: number;
  chapters: {
    posted: number;
    total: number | null; // when the total is '?'
  };
  hits: number;
}

/**
 * Tagged information about a work
 */
export interface WorkTags {
  rating: string;
  warnings: string[];
  category: string[];
  fandoms: string[];
  relationships: string[];
  characters: string[];
  freeforms: string[]
}

/**
 * Full information about a work
 */
export interface Work {
  id: string;
  title: string;
  author: string;
  summary: string; // HTML string
  language: string;
  stats: WorkStats;
  tags: WorkTags;
}

/**
 * Simplified work information for search results and listings
 */
export interface WorkSearchResult {
  id: string;
  title: string;
  author: string;
  fandoms: string[];
  words: number;
  kudos: number;
  hits: number;
}

/**
 * Individual chapter information
 */
export interface Chapter {
  id: string;
  title: string;
}

/**
 * Complete chapter content
 */
export interface ChapterContent {
  chapterId: string;
  workId: string;
  title: string;
  summary: string | null;
  notes: string | null;
  content: string;
  endNotes: string | null;
}