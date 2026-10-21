export interface Comment {
  id: string;
  workId: string;
  chapterId?: string;
  author: string;
  authorId?: string;
  isAuthorGuest: boolean;
  content: string;
  posted: string;
  edited?: string;
  parentId?: string;
  threadId: string;
  depth: number;
  kudos: number;
  replies: Comment[];
}

export interface CommentResults {
  comments: Comment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AllCommentResults {
  comments: Comment[]
  total: number
  totalPages: number
  /** Pages actually fetched; lower than totalPages when maxPages stopped early. */
  fetchedPages: number
}

export interface AllWorkCommentsOptions {
  /** Stop after this many comment pages. */
  maxPages?: number
  /** Milliseconds to wait between comment pages. Defaults to 1000. */
  delayMs?: number
}
