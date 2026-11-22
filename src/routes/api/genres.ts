import { createFileRoute } from "@tanstack/react-router";

import { getDb } from "@/server/db";

// Genre exploration: how many movies sit in each genre and what they average.
export const Route = createFileRoute("/api/genres")({
  server: {
    handlers: {
      GET: async () => {
        const t0 = Date.now();
        const db = await getDb();
        const genres = await db
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
                genre: "$_id",
                _id: 0,
                movies: 1,
                ratings: 1,
                average: { $round: [{ $divide: ["$total", "$ratings"] }, 3] },
              },
            },
            { $sort: { movies: -1 } },
          ])
          .toArray();

        return Response.json({ ms: Date.now() - t0, count: genres.length, genres });
      },
    },
  },
});
