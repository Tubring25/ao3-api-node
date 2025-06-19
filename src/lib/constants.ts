import { Rating, Warning, Category, SortColumn } from "../types/index.js";

export const ratingMap: Record<Rating, string> = {
  'Not Rated': '9',
  'General Audiences': '10',
  'Teen And Up Audiences': '11',
  'Mature': '12',
  'Explicit': '13'
};
export const warningMap: Record<Warning, string> = { 
  'Creator Chose Not To Use Archive Warnings': '14',
  'No Archive Warnings Apply': '16',
  'Graphic Depictions Of Violence': '17',
  'Major Character Death': '18',
  'Rape/Non-Con': '19',
  'Underage': '20'
};
export const categoryMap: Record<Category, string> = {
  'F/F': '116',
  'F/M': '22',
  'Gen': '21',
  'M/M': '23',
  'Multi': '2246',
  'Other': '24',
  'Non-Binary': '25'
};
export const sortColumnMap: Record<SortColumn, string> = {
  'Best Match': '_score',
  'Author': 'authors_to_sort_on',
  'Title': 'title_to_sort_on',
  'Date Posted': 'created_at',
  'Date Updated': 'revised_at',
  'Word Count': 'word_count',
  'Hits': 'hits',
  'Kudos': 'kudos_count',
  'Comments': 'comments_count',
  'Bookmarks': 'bookmarks_count'
};