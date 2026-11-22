import { createFileRoute } from "@tanstack/react-router";

import { getDb } from "@/server/db";
import type { RatedMovie, RatingDoc, UserDoc } from "@/server/types";

// User info plus the ratings they filed, with the movie title attached.
export const Route = createFileRoute("/api/users/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const userId = Number(params.id);
        if (!Number.isInteger(userId) || userId <= 0) {
          return Response.json({ error: "user id must be a positive integer" }, { status: 400 });
        }

        const t0 = Date.now();
        const db = await getDb();
        const [user, rated] = await Promise.all([
          db.collection<UserDoc>("users").findOne({ _id: userId }),
          db
            .collection<RatingDoc>("ratings")
            .aggregate<RatedMovie>([
              { $match: { userId } },
              { $sort: { ratedAt: -1 } },
              { $limit: 100 },
              {
                $lookup: {
                  from: "movies",
                  localField: "movieId",
                  foreignField: "_id",
                  as: "movie",
                },
              },
              { $unwind: "$movie" },
              {
                $project: {
                  _id: 0,
                  movieId: 1,
                  rating: 1,
                  ratedAt: 1,
                  title: "$movie.title",
                  year: "$movie.year",
                  genres: "$movie.genres",
                },
              },
            ])
            .toArray(),
        ]);

        if (!user) return Response.json({ error: "user not found", userId }, { status: 404 });

        const average = rated.length
          ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length
          : null;

        return Response.json({
          ms: Date.now() - t0,
          user: {
            userId: user._id,
            displayName: user.displayName,
            country: user.country,
            ratingCount: user.ratingCount,
          },
          average: average === null ? null : Math.round(average * 1000) / 1000,
          shown: rated.length,
          ratings: rated,
        });
      },
    },
  },
});
