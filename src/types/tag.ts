
export type TagCategory =
  | 'Rating'
  | 'Archive Warning'
  | 'Category'
  | 'Media'
  | 'Fandom'
  | 'Relationship'
  | 'Character'
  | 'Additional Tags'
  | 'Unsorted Tag'
  | 'Tag'

export interface TagDetails {
  name: string,
  category: TagCategory,
  canonical: boolean,
  adult: boolean,
  synonymOf: string | null,
  synonyms: string[],
  parents: string[],
  metaTags: string[],
  subTags: string[],
  children: string[],
  childrenTruncated: boolean,
}
