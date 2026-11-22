import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";

import { Panel, Stat, State, Table, type Row } from "@/components/shell";
import { formatCount, useApi } from "@/lib/api";

const Chart = lazy(() => import("@/components/Chart"));

type Health = {
  ok: boolean;
  counts: { movies?: number; users?: number; ratings?: number; tags?: number };
};
type GenreRow = { genre: string; movies: number; ratings: number; average: number };
type Genres = { genres: GenreRow[] };
type TopRated = { data: Array<{ _id: number; title: string; year: number; average: number; ratings: number }> };
type Activity = { data: Array<{ year: number; ratings: number; average: number; activeUsers: number }> };
type Distribution = { data: Array<{ rating: number; count: number }> };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MovieVerse Analytics — Overview" },
      {
        name: "description",
        content:
          "Live totals, genre breakdown, the ten best-rated films and rating activity over time.",
      },
      { property: "og:title", content: "MovieVerse Analytics — Overview" },
      {
        property: "og:description",
        content:
          "Live totals, genre breakdown, the ten best-rated films and rating activity over time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function ChartBox({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly fallback={<div className="h-[260px] animate-pulse bg-muted" />}>
      <Suspense fallback={<div className="h-[260px] animate-pulse bg-muted" />}>{children}</Suspense>
    </ClientOnly>
  );
}

function Overview() {
  const health = useApi<Health>("/api/health");
  const genres = useApi<Genres>("/api/genres");
  const top = useApi<TopRated>("/api/analytics/top-rated");
  const activity = useApi<Activity>("/api/analytics/activity");
  const distribution = useApi<Distribution>("/api/analytics/distribution");

  const counts = health.data?.counts ?? {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold uppercase tracking-[0.1em] text-foreground">
          The catalogue at a glance
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Nine thousand seven hundred and forty-two films, rated and tagged by six hundred and ten
          people. Everything below comes from the REST API.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Films" value={formatCount(counts.movies)} sub="titles in the catalogue" />
        <Stat label="Ratings" value={formatCount(counts.ratings)} sub="scores filed" />
        <Stat label="Tags" value={formatCount(counts.tags)} sub="free-text labels" />
        <Stat label="Users" value={formatCount(counts.users)} sub="people rating" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Films per genre" hint="A film can sit in several genres">
          <State isLoading={genres.isLoading} isError={genres.isError} error={genres.error}>
            <ChartBox>
              <Chart
                kind="bar"
                height={320}
                rotateX
                xKey="genre"
                data={(genres.data?.genres ?? []) as unknown as Row[]}
                series={[{ key: "movies", label: "Films" }]}
              />
            </ChartBox>
          </State>
        </Panel>

        <Panel title="How ratings fall" hint="Every value from half a star to five">
          <State
            isLoading={distribution.isLoading}
            isError={distribution.isError}
            error={distribution.error}
          >
            <ChartBox>
              <Chart
                kind="area"
                height={280}
                xKey="rating"
                data={(distribution.data?.data ?? []) as unknown as Row[]}
                series={[{ key: "count", label: "Ratings" }]}
              />
            </ChartBox>
          </State>
        </Panel>
      </div>

      <Panel
        title="Ten best-rated films"
        hint="At least fifty ratings, so one keen voter cannot win"
        actions={
          <Link
            to="/browse"
            className="font-display text-[12px] uppercase tracking-[0.16em] text-primary hover:underline"
          >
            Browse the catalogue
          </Link>
        }
      >
        <State isLoading={top.isLoading} isError={top.isError} error={top.error}>
          <Table
            rows={(top.data?.data ?? []) as unknown as Row[]}
            columns={[
              {
                key: "title",
                label: "Film",
                render: (row) => (
                  <Link to="/movies/$id" params={{ id: String(row._id) }} className="hover:underline">
                    {String(row.title)}
                  </Link>
                ),
              },
              { key: "year", label: "Year", align: "right" },
              { key: "ratings", label: "Ratings", align: "right" },
              { key: "average", label: "Average", align: "right" },
            ]}
          />
        </State>
      </Panel>

      <Panel title="Rating activity by year" hint="How many scores were filed each year">
        <State isLoading={activity.isLoading} isError={activity.isError} error={activity.error}>
          <ChartBox>
            <Chart
              kind="line"
              height={260}
              xKey="year"
              data={(activity.data?.data ?? []) as unknown as Row[]}
              series={[{ key: "ratings", label: "Ratings filed" }]}
            />
          </ChartBox>
        </State>
      </Panel>
    </div>
  );
}
