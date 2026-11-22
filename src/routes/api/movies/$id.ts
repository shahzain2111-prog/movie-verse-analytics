import { createFileRoute } from "@tanstack/react-router";

import { getDb } from "@/server/db";
import type { MovieDoc, RatingDoc, TagDoc } from "@/server/types";

export const Route = createFileRoute("/api/movies/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const movieId = Number(params.id);
        if (!Number.isInteger(movieId) || movieId <= 0) {
          return Response.json({ error: "movie id must be a positive integer" }, { status: 400 });
        }

        const t0 = Date.now();
        const db = await getDb();
        const [movie, ratings, tags] = await Promise.all([
          db.collection<MovieDoc>("movies").findOne({ _id: movieId }),
          db
            .collection<RatingDoc>("ratings")
            .find({ movieId })
            .sort({ ratedAt: -1 })
            .limit(50)
            .toArray(),
          db
            .collection<TagDoc>("tags")
            .find({ movieId })
            .sort({ taggedAt: -1 })
            .limit(50)
            .toArray(),
        ]);

        if (!movie) return Response.json({ error: "movie not found", movieId }, { status: 404 });

        return Response.json({
          ms: Date.now() - t0,
          movie,
          ratings: ratings.map((r) => ({
            userId: r.userId,
            rating: r.rating,
            ratedAt: r.ratedAt,
          })),
          tags: tags.map((t) => ({ userId: t.userId, tag: t.tag, taggedAt: t.taggedAt })),
        });
      },
    },
  },
});
