import type { ReactNode } from "react";

// Rows come back from the API with different shapes per endpoint. Listing the
// fields the dashboard actually reads (all optional) keeps dot access legal
// under the project's strict index-signature rule.
export type Row = {
  _id?: number;
  title?: string;
  year?: number | null;
  genres?: string[];
  average?: number | null;
  ratings?: number;
  rating?: number;
  tags?: number;
  tag?: string;
  tagCount?: number;
  times?: number;
  topGenres?: Array<{ genre: string; movies: number }>;
  userId?: number;
  user?: string;
  displayName?: string;
  country?: string;
  movieId?: number;
  ratedAt?: string;
  taggedAt?: string;
  count?: number;
  movies?: number;
  genre?: string;
  bias?: number;
  spread?: number;
  activeUsers?: number;
};

export type Column = {
  key: string;
  label: string;
  align?: "right";
  render?: (row: Row) => ReactNode;
};

export function Panel({
  title,
  hint,
  actions,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-border bg-card ${className}`}>
      {title && (
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="font-display text-sm font-medium uppercase tracking-[0.18em] text-foreground">
              {title}
            </h2>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="border border-border bg-card px-4 py-3">
      <div className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl leading-none text-primary">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Table({
  rows,
  columns,
  empty = "No rows.",
}: {
  rows: Row[];
  columns: Column[];
  empty?: string;
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 font-display text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 align-top ${c.align === "right" ? "text-right tabular-nums" : "text-left"}`}
                >
                  {c.render
                    ? c.render(row)
                    : String((row as Record<string, unknown>)[c.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="mr-1 inline-block border border-border bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
      {children}
    </span>
  );
}

export function State({
  isLoading,
  isError,
  error,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  children: ReactNode;
}) {
  if (isError) {
    return (
      <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
        {error instanceof Error ? error.message : "The API request failed."}
      </p>
    );
  }
  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        <div className="h-3 w-1/3 animate-pulse bg-muted" />
        <div className="h-3 w-2/3 animate-pulse bg-muted" />
        <div className="h-3 w-1/2 animate-pulse bg-muted" />
      </div>
    );
  }
  return <>{children}</>;
}
