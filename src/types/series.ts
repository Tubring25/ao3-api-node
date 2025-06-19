import { WorkSearchResult } from "./work.js";

/**
 * Statistical information about a series
 */
export interface SeriesStats {
  words: number;
  works: number;
  complete: boolean;
  bookmarks: number;
}

/**
 * Complete information about a series
 */
export interface Series {
  id: string;
  title: string;
  authors: string[];
  description: string | null;
  notes: string | null;
  stats: SeriesStats;
  works: WorkSearchResult[];
}