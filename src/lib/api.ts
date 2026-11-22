import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

// Every dashboard screen reads the REST API only - it never touches the
// database. Fetching is gated on hydration so the server render never tries to
// resolve a relative URL it has no origin for.
export function useApi<T>(path: string | null) {
  const hydrated = useHydrated();
  return useQuery({
    queryKey: [path],
    queryFn: async (): Promise<T> => {
      const res = await fetch(path as string, {
        headers: { Accept: "application/json" },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : `Request failed with status ${res.status}`;
        throw new Error(detail);
      }
      return body as T;
    },
    enabled: hydrated && Boolean(path),
    staleTime: 30_000,
    retry: 1,
  });
}

export function formatCount(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("en-GB");
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}
