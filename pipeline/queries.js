// MovieVerse Analytics - Component 3 Part A: the nine required queries.
//
// Run BEFORE indexes for the "before" timings, then again after:
//   mongosh movieverse pipeline/queries.js
//   mongosh movieverse pipeline/indexes.js
//   mongosh movieverse pipeline/queries.js
//
// Each query prints its own elapsed milliseconds. Part B needs queries 1,3,5,7.

// Helper: run a pipeline on a collection, print result + elapsed ms.
function run(label, pipeline, opts) {
  const t = new Date().getTime();
  const out = db.getCollection(opts.coll).aggregate(pipeline, opts.aggregate).toArray();
  print("\n=== " + label + "  [" + (new Date().getTime() - t) + " ms] ===");
  printjson(out);
  return out;
}

// Q1. Ten highest-rated movies.
// Interpretation: an average only means something with enough ratings, so a
// movie needs at least 50; otherwise one 5-star vote beats a film rated 4.8 by
// 2,000 people.
run("Q1  Top 10 highest-rated movies (>=50 ratings)", [
  { $match: { "ratingStats.count": { $gte: 50 } } },
  { $sort: { "ratingStats.average": -1, "ratingStats.count": -1 } },
  { $limit: 10 },
  { $project: { _id: 1, title: 1, year: 1, genres: 1,
      average: "$ratingStats.average", ratings: "$ratingStats.count" } },
], { coll: "movies" });

// Q2. Average rating for each genre.
// Interpretation: a movie sits in several genres so its ratings count in each;
// weighted by rating count so one obscure film cannot top a popular genre.
run("Q2  Average rating per genre (weighted by rating count)", [
  { $match: { "ratingStats.count": { $gt: 0 } } },
  { $unwind: "$genres" },
  { $group: { _id: "$genres", movies: { $sum: 1 },
      ratings: { $sum: "$ratingStats.count" },
      total: { $sum: { $multiply: ["$ratingStats.average", "$ratingStats.count"] } } } },
  { $project: { _id: 1, movies: 1, ratings: 1,
      average: { $round: [{ $divide: ["$total", "$ratings"] }, 3] } } },
  { $sort: { average: -1 } },
], { coll: "movies" });

// Q3. Most active users. Interpretation: activity = number of ratings filed.
run("Q3  Top 10 most active users (by number of ratings)", [
  { $group: { _id: "$userId", ratings: { $sum: 1 }, average: { $avg: "$rating" } } },
  { $sort: { ratings: -1 } },
  { $limit: 10 },
  { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
  { $unwind: "$user" },
  { $project: { userId: "$_id", _id: 0, displayName: "$user.displayName",
      country: "$user.country", ratings: 1, average: { $round: ["$average", 3] } } },
], { coll: "ratings" });

// Q4. Movies tagged most frequently.
run("Q4  Top 10 most tagged movies", [
  { $group: { _id: "$movieId", tags: { $sum: 1 } } },
  { $sort: { tags: -1 } },
  { $limit: 10 },
  { $lookup: { from: "movies", localField: "_id", foreignField: "_id", as: "movie" } },
  { $unwind: "$movie" },
  { $project: { movieId: "$_id", _id: 0, title: "$movie.title",
      year: "$movie.year", tags: 1 } },
], { coll: "tags" });

// Q5. Rating activity over time, by year.
run("Q5  Rating activity by year", [
  { $group: { _id: { $year: "$ratedAt" }, ratings: { $sum: 1 },
      average: { $avg: "$rating" }, users: { $addToSet: "$userId" } } },
  { $project: { year: "$_id", _id: 0, ratings: 1,
      average: { $round: ["$average", 3] }, activeUsers: { $size: "$users" } } },
  { $sort: { year: 1 } },
], { coll: "ratings" });

// Q6. Movies that divide opinion most.
// Interpretation: widest spread of opinions = highest standard deviation of the
// ratings given, limited to movies with at least 30 ratings so a handful of
// mixed votes cannot top the list.
run("Q6  Top 10 most divisive movies (highest spread, >=30 ratings)", [
  { $group: { _id: "$movieId", ratings: { $sum: 1 },
      average: { $avg: "$rating" }, spread: { $stdDevSamp: "$rating" } } },
  { $match: { ratings: { $gte: 30 } } },
  { $sort: { spread: -1 } },
  { $limit: 10 },
  { $lookup: { from: "movies", localField: "_id", foreignField: "_id", as: "movie" } },
  { $unwind: "$movie" },
  { $project: { movieId: "$_id", _id: 0, title: "$movie.title", year: "$movie.year",
      ratings: 1, spread: { $round: ["$spread", 3] },
      average: { $round: ["$average", 3] } } },
], { coll: "ratings" });

// Q7. Distribution of ratings across the available values.
run("Q7  Distribution of ratings by value", [
  { $group: { _id: "$rating", count: { $sum: 1 } } },
  { $project: { _id: 0, rating: "$_id", count: 1 } },
  { $sort: { rating: 1 } },
], { coll: "ratings" });

// Q8. Users who rate consistently higher or lower than the typical user.
// Interpretation: compare each user's own average with the platform-wide
// average; only users with 20+ ratings qualify so one keen vote cannot make
// someone an outlier.
const global = db.ratings.aggregate([
  { $group: { _id: null, platformAverage: { $avg: "$rating" } } },
]).toArray()[0].platformAverage;
print("\nPlatform-wide average rating: " + global.toFixed(4));

function bias(sortDir) {
  return [
    { $group: { _id: "$userId", ratings: { $sum: 1 }, average: { $avg: "$rating" } } },
    { $match: { ratings: { $gte: 20 } } },
    { $addFields: { bias: { $subtract: ["$average", global] } } },
    { $sort: { bias: sortDir } },
    { $limit: 10 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $project: { userId: "$_id", _id: 0, displayName: "$user.displayName",
        ratings: 1, average: { $round: ["$average", 3] },
        bias: { $round: ["$bias", 3] } } },
  ];
}
run("Q8a  Users rating consistently HIGHER than the typical user", bias(-1), { coll: "ratings" });
run("Q8b  Users rating consistently LOWER than the typical user", bias(1), { coll: "ratings" });

// Q9. Most common tags and the genres they are most associated with.
run("Q9  Top 10 tags with their strongest genres", [
  { $group: { _id: "$tagLower", times: { $sum: 1 }, movies: { $addToSet: "$movieId" } } },
  { $sort: { times: -1 } },
  { $limit: 10 },
  { $unwind: "$movies" },
  { $lookup: { from: "movies", localField: "movies", foreignField: "_id", as: "movie" } },
  { $unwind: "$movie" },
  { $unwind: "$movie.genres" },
  { $group: { _id: { tag: "$_id", genre: "$movie.genres" },
      times: { $first: "$times" }, movies: { $sum: 1 } } },
  { $sort: { "_id.tag": 1, movies: -1 } },
  { $group: { _id: "$_id.tag", times: { $first: "$times" },
      topGenres: { $push: { genre: "$_id.genre", movies: "$movies" } } } },
  { $project: { tag: "$_id", _id: 0, times: 1, topGenres: { $slice: ["$topGenres", 3] } } },
  { $sort: { times: -1 } },
], { coll: "tags" });

print("\n--- done: keep the four [ ms ] lines for queries 1, 3, 5 and 7 ---");
