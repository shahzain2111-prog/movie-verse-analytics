import { createFileRoute } from "@tanstack/react-router";

import { getDb } from "@/server/db";

const COLLECTIONS = ["movies", "users", "ratings", "tags"] as const;

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const t0 = Date.now();
        try {
          const db = await getDb();
          const counts: Record<string, number> = {};
          for (const c of COLLECTIONS) counts[c] = await db.collection(c).countDocuments();
          return Response.json({ ok: true, ms: Date.now() - t0, counts });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "database unreachable" },
            { status: 503 },
          );
        }
      },
    },
  },
});
