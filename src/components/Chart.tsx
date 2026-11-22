import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Chart colours come from the same design tokens the rest of the app uses, so a
// theme change carries through to the charts. getComputedStyle resolves the
// values, which is what SVG needs - a CSS variable in an SVG attribute does not
// resolve.
const TOKENS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"] as const;

function useTheme() {
  const [theme, setTheme] = useState<{ palette: string[]; axis: string } | null>(null);
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setTheme({
      palette: TOKENS.map((t) => styles.getPropertyValue(t).trim() || "#888"),
      axis: styles.getPropertyValue("--muted-foreground").trim() || "#999",
    });
  }, []);
  return theme;
}

function Tip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <div className="mb-1 font-medium text-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="text-muted-foreground">
          <span
            className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: p.color }}
          />
          {p.name}: <span className="text-foreground">{p.value}</span>
          {unit}
        </div>
      ))}
    </div>
  );
}

export type ChartProps = {
  kind: "bar" | "line" | "area" | "pie";
  data: object[];
  xKey: string;
  series: Array<{ key: string; label: string }>;
  height?: number;
  unit?: string;
  /** Tilt the bottom labels so long category names stay readable. */
  rotateX?: boolean;
};

export default function Chart({
  kind,
  data,
  xKey,
  series,
  height = 260,
  unit = "",
  rotateX = false,
}: ChartProps) {
  const theme = useTheme();
  if (!theme || !data.length) {
    return (
      <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
        Waiting for data
      </div>
    );
  }
  const { palette, axis } = theme;

  const xTick = { fill: axis, fontSize: 11 };
  const xProps = rotateX
    ? { interval: 0 as const, angle: -40, textAnchor: "end" as const, height: 74, dy: -6 }
    : {};

  const grid = <CartesianGrid stroke={axis} strokeOpacity={0.18} strokeDasharray="3 3" />;
  // Recharts only recognises axis components that are direct children of the
  // chart, so these are two separate elements rather than one fragment.
  const xAxis = (
    <XAxis
      dataKey={xKey}
      tick={xTick}
      tickLine={false}
      axisLine={{ stroke: axis, strokeOpacity: 0.4 }}
      {...xProps}
    />
  );
  const yAxis = (
    <YAxis
      tick={xTick}
      tickLine={false}
      axisLine={false}
      width={52}
      tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
    />
  );
  const tip = <Tip unit={unit} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === "bar" ? (
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          {grid}
          {xAxis}
          {yAxis}
          <Tooltip content={tip} cursor={{ fill: axis, fillOpacity: 0.08 }} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={palette[i % palette.length]}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      ) : kind === "line" ? (
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          {grid}
          {xAxis}
          {yAxis}
          <Tooltip content={tip} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={palette[i % palette.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      ) : kind === "area" ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          {grid}
          {xAxis}
          {yAxis}
          <Tooltip content={tip} />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={palette[i % palette.length]}
              fill={palette[i % palette.length]}
              fillOpacity={0.22}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      ) : (
        <PieChart height={height}>
          <Tooltip content={tip} />
          <Legend wrapperStyle={{ fontSize: 11, color: axis }} />
          <Pie
            data={data}
            dataKey={series[0]?.key ?? xKey}
            nameKey={xKey}
            innerRadius={44}
            outerRadius={88}
            paddingAngle={2}
            label={{ fill: axis, fontSize: 11 }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      )}
    </ResponsiveContainer>
  );
}
