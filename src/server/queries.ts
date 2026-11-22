import type { Db } from "mongodb";

// The nine required analytics queries, one entry per view name.
// Each entry knows which collection it runs on and returns its rows, so the
// API layer only has to call run() and time it.

export type AnalyticsView = {
  label: string;
  coll: "movies" | "users" | "ratings" | "tags";
  run: (db: Db) => Promise<unknown[]>;
};

export const ANALYTICS: Record<string, AnalyticsView> = {
  // Q1 - ten highest-rated movies. An average only means something with enough
  // ratings, so a movie needs at least 50.
  "top-rated": {
    label: "Top 10 highest-rated movies (>=50 ratings)",
    coll: "movies",
    run: (db) =>
      db
        .collection("movies")
        .aggregate([
          { $match: { "ratingStats.count": { $gte: 50 } } },
          { $sort: { "ratingStats.average": -1, "ratingStats.count": -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 1,
              title: 1,
              year: 1,
              genres: 1,
              average: "$ratingStats.average",
              ratings: "$ratingStats.count",
            },
          },
        ])
        .toArray(),
  },

  // Q2 - average rating per genre, weighted by rating count so one obscure film
  // cannot top a popular genre.
  "genre-ratings": {
    label: "Average rating per genre (weighted by rating count)",
    coll: "movies",
    run: (db) =>
      db
        .collection("movies")
        .aggregate([
          { $match: { "ratingStats.count": { $gt: 0 } } },
          { $unwind: "$genres" },
          {
            $group: {
              _id: "$genres",
              movies: { $sum: 1 },
              ratings: { $sum: "$ratingStats.count" },
              total: {
                $sum: { $multiply: ["$ratingStats.average", "$ratingStats.count"] },
              },
            },
          },
          {
            $project: {
              _id: 1,
              movies: 1,
              ratings: 1,
              average: { $round: [{ $divide: ["$total", "$ratings"] }, 3] },
            },
          },
          { $sort: { average: -1 } },
        ])
        .toArray(),
  },

  // Q3 - most active users; activity = number of ratings filed.
  "active-users": {
    label: "Top 10 most active users (by number of ratings)",
    coll: "ratings",
    run: (db) =>
      db
        .collection("ratings")
        .aggregate([
          { $group: { _id: "$userId", ratings: { $sum: 1 }, average: { $avg: "$rating" } } },
          { $sort: { ratings: -1 } },
          { $limit: 10 },
          { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
          { $unwind: "$user" },
          {
            $project: {
              userId: "$_id",
              _id: 0,
              displayName: "$user.displayName",
              country: "$user.country",
              ratings: 1,
              average: { $round: ["$average", 3] },
            },
          },
        ])
        .toArray(),
  },

  // Q4 - movies tagged most frequently.
  "most-tagged": {
    label: "Top 10 most tagged movies",
    coll: "tags",
    run: (db) =>
      db
        .collection("tags")
        .aggregate([
          { $group: { _id: "$movieId", tags: { $sum: 1 } } },
          { $sort: { tags: -1 } },
          { $limit: 10 },
          { $lookup: { from: "movies", localField: "_id", foreignField: "_id", as: "movie" } },
          { $unwind: "$movie" },
          {
            $project: {
              movieId: "$_id",
              _id: 0,
              title: "$movie.title",
              year: "$movie.year",
              tags: 1,
            },
          },
        ])
        .toArray(),
  },

  // Q5 - rating activity over time, by year.
  activity: {
    label: "Rating activity by year",
    coll: "ratings",
    run: (db) =>
      db
        .collection("ratings")
        .aggregate([
          {
            $group: {
              _id: { $year: "$ratedAt" },
              ratings: { $sum: 1 },
              average: { $avg: "$rating" },
              users: { $addToSet: "$userId" },
            },
          },
          {
            $project: {
              year: "$_id",
              _id: 0,
              ratings: 1,
              average: { $round: ["$average", 3] },
              activeUsers: { $size: "$users" },
            },
          },
          { $sort: { year: 1 } },
        ])
        .toArray(),
  },

  // Q6 - widest spread of opinions = highest standard deviation, restricted to
  // movies with at least 30 ratings.
  divisive: {
    label: "Top 10 most divisive movies (highest spread, >=30 ratings)",
    coll: "ratings",
    run: (db) =>
      db
        .collection("ratings")
        .aggregate([
          {
            $group: {
              _id: "$movieId",
              ratings: { $sum: 1 },
              average: { $avg: "$rating" },
              spread: { $stdDevSamp: "$rating" },
            },
          },
          { $match: { ratings: { $gte: 30 } } },
          { $sort: { spread: -1 } },
          { $limit: 10 },
          { $lookup: { from: "movies", localField: "_id", foreignField: "_id", as: "movie" } },
          { $unwind: "$movie" },
          {
            $project: {
              movieId: "$_id",
              _id: 0,
              title: "$movie.title",
              year: "$movie.year",
              ratings: 1,
              spread: { $round: ["$spread", 3] },
              average: { $round: ["$average", 3] },
            },
          },
        ])
        .toArray(),
  },

  // Q7 - how ratings fall across the available values.
  distribution: {
    label: "Distribution of ratings by value",
    coll: "ratings",
    run: (db) =>
      db
        .collection("ratings")
        .aggregate([
          { $group: { _id: "$rating", count: { $sum: 1 } } },
          { $project: { _id: 0, rating: "$_id", count: 1 } },
          { $sort: { rating: 1 } },
        ])
        .toArray(),
  },

  // Q8 - users whose own average sits furthest above or below the platform
  // average; only users with 20+ ratings qualify.
  "bias-high": {
    label: "Users rating consistently HIGHER than the typical user",
    coll: "ratings",
    run: (db) => bias(db, -1),
  },
  "bias-low": {
    label: "Users rating consistently LOWER than the typical user",
    coll: "ratings",
    run: (db) => bias(db, 1),
  },

  // Q9 - most common tags and the genres they are strongest in.
  tags: {
    label: "Top 10 tags with their strongest genres",
    coll: "tags",
    run: (db) =>
      db
        .collection("tags")
        .aggregate([
          { $group: { _id: "$tagLower", times: { $sum: 1 }, movies: { $addToSet: "$movieId" } } },
          { $sort: { times: -1 } },
          { $limit: 10 },
          { $unwind: "$movies" },
          {
            $lookup: {
              from: "movies",
              localField: "movies",
              foreignField: "_id",
              as: "movie",
            },
          },
          { $unwind: "$movie" },
          { $unwind: "$movie.genres" },
          {
            $group: {
              _id: { tag: "$_id", genre: "$movie.genres" },
              times: { $first: "$times" },
              movies: { $sum: 1 },
            },
          },
          { $sort: { "_id.tag": 1, movies: -1 } },
          {
            $group: {
              _id: "$_id.tag",
              times: { $first: "$times" },
              topGenres: { $push: { genre: "$_id.genre", movies: "$movies" } },
            },
          },
          {
            $project: {
              tag: "$_id",
              _id: 0,
              times: 1,
              topGenres: { $slice: ["$topGenres", 3] },
            },
          },
          { $sort: { times: -1 } },
        ])
        .toArray(),
  },
};

async function bias(db: Db, sortDir: number): Promise<unknown[]> {
  const [platform] = await db
    .collection("ratings")
    .aggregate([{ $group: { _id: null, platformAverage: { $avg: "$rating" } } }])
    .toArray();
  const global = (platform as { platformAverage: number }).platformAverage;
  return db
    .collection("ratings")
    .aggregate([
      { $group: { _id: "$userId", ratings: { $sum: 1 }, average: { $avg: "$rating" } } },
      { $match: { ratings: { $gte: 20 } } },
      { $addFields: { bias: { $subtract: ["$average", global] } } },
      { $sort: { bias: sortDir } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          _id: 0,
          displayName: "$user.displayName",
          ratings: 1,
          average: { $round: ["$average", 3] },
          bias: { $round: ["$bias", 3] },
        },
      },
    ])
    .toArray();
}
