import { createFileRoute } from "@tanstack/react-router";

import { getDb } from "@/server/db";
import { ANALYTICS } from "@/server/queries";

// One endpoint for all nine analytics views: /api/analytics/top-rated and so on.
// The view name is checked against a fixed list, so nothing user-supplied is
// ever used as a collection or field name.
export const Route = createFileRoute("/api/analytics/$view")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const spec = ANALYTICS[params.view];
        if (!spec) {
          return Response.json(
            { error: "unknown analytics view", view: params.view, views: Object.keys(ANALYTICS) },
            { status: 404 },
          );
        }

        const t0 = Date.now();
        try {
          const db = await getDb();
          const data = await spec.run(db);
          return Response.json({
            view: params.view,
            label: spec.label,
            collection: spec.coll,
            ms: Date.now() - t0,
            count: data.length,
            data,
          });
        } catch (error) {
          return Response.json(
            { error: "query failed", view: params.view, detail: error instanceof Error ? error.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
