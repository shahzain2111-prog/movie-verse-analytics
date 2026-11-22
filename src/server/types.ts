// Document shapes for the four collections, as produced by pipeline/transform.py.
// Typing them keeps the driver from falling back to its index-signature Document
// and lets _id stay a number rather than an ObjectId.

export type MovieDoc = {
  _id: number;
  title: string;
  year: number | null;
  genres: string[];
  links: { imdbId: string | null; tmdbId: number | null };
  ratingStats: { count: number; average: number | null };
  tagCount: number;
};

export type UserDoc = {
  _id: number;
  displayName: string;
  email: string;
  country: string;
  ratingCount: number;
};

export type RatingDoc = {
  userId: number;
  movieId: number;
  rating: number;
  ratedAt: Date;
};

export type TagDoc = {
  userId: number;
  movieId: number;
  tag: string;
  tagLower: string;
  taggedAt: Date;
};

export type MovieSummary = {
  _id: number;
  title: string;
  year: number | null;
  genres: string[];
  average: number | null;
  ratings: number;
  tags: number;
};

export type RatedMovie = {
  movieId: number;
  title: string;
  year: number | null;
  genres: string[];
  rating: number;
  ratedAt: Date;
};
