import { createFileRoute } from "@tanstack/react-router";
import type { Filter, Sort } from "mongodb";
import { z } from "zod";

import { getDb } from "@/server/db";
import type { MovieDoc, MovieSummary } from "@/server/types";

// Every query parameter is validated and bounded before it reaches MongoDB.
const Search = z.object({
  q: z.string().trim().max(80).optional(),
  genre: z.string().trim().max(40).optional(),
  year: z.coerce.number().int().min(1870).max(2030).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minRatings: z.coerce.number().int().min(0).max(100000).optional(),
  sort: z.enum(["rating", "count", "year", "title"]).default("rating"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const SORTS: Record<"rating" | "count" | "year" | "title", Sort> = {
  rating: { "ratingStats.average": -1, "ratingStats.count": -1 },
  count: { "ratingStats.count": -1 },
  year: { year: -1, title: 1 },
  title: { title: 1 },
};

// Titles contain characters like "." and "(" that would otherwise be read as
// regular-expression syntax.
function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const Route = createFileRoute("/api/movies/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = Search.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return Response.json(
            { error: "invalid search parameters", issues: parsed.error.issues },
            { status: 400 },
          );
        }
        const { q, genre, year, minRating, minRatings, sort, page, limit } = parsed.data;

        const filter: Record<string, unknown> = {};
        if (q) filter["title"] = { $regex: escapeRegex(q), $options: "i" };
        if (genre) filter["genres"] = genre;
        if (year !== undefined) filter["year"] = year;
        if (minRating !== undefined) filter["ratingStats.average"] = { $gte: minRating };
        if (minRatings !== undefined) filter["ratingStats.count"] = { $gte: minRatings };

        const t0 = Date.now();
        const db = await getDb();
        const movies = db.collection<MovieDoc>("movies");
        const [total, rows] = await Promise.all([
          movies.countDocuments(filter as Filter<MovieDoc>),
          movies
            .find(filter as Filter<MovieDoc>, {
              projection: {
                title: 1,
                year: 1,
                genres: 1,
                average: "$ratingStats.average",
                ratings: "$ratingStats.count",
                tags: "$tagCount",
              },
            })
            .sort(SORTS[sort])
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
        ]);

        return Response.json({
          ms: Date.now() - t0,
          total,
          page,
          limit,
          pages: Math.max(1, Math.ceil(total / limit)),
          results: rows as unknown as MovieSummary[],
        });
      },
    },
  },
});
