export type CollectionChallengeType =
  | 'GiftExchange'
  | 'PromptMeme'

export interface Collection {
  name: string;
  title: string;
  descriptionHtml: string | null;
  closed: boolean;
  moderated: boolean;
  unrevealed: boolean;
  anonymous: boolean;
  challengeType: CollectionChallengeType | null;
  workCount: number;
  bookmarkCount: number;
}
