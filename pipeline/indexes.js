// mongosh movieverse pipeline/indexes.js
db.ratings.createIndex({ movieId: 1, rating: -1 });
db.ratings.createIndex({ userId: 1, ratedAt: -1 });
db.tags.createIndex({ tagLower: 1 });
db.tags.createIndex({ movieId: 1 });
db.movies.createIndex({ genres: 1, "ratingStats.average": -1 });
db.movies.createIndex({ year: 1 });
db.movies.createIndex({ title: "text" });
db.users.createIndex({ country: 1 });
