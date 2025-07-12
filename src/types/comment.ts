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