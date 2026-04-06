'use client';

/**
 * RevenueChart
 *
 * Line chart showing daily revenue for the last 7 days.
 * Dark admin theme — accent #d4a843 gold line.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export type RevenueDataPoint = {
  date: string; // "Jan 1", "Jan 2", etc.
  revenue: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[#6b7280] text-xs mb-1">{label}</p>
      <p className="text-white font-semibold text-sm">
        $
        {payload[0].value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
    </div>
  );
}

type RevenueChartProps = {
  data: RevenueDataPoint[];
};

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2d4e" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#d4a843"
          strokeWidth={2.5}
          dot={{ fill: '#d4a843', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#d4a843', stroke: '#0a0f1e', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
