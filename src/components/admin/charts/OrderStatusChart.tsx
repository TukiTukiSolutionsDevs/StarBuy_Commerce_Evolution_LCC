'use client';

/**
 * OrderStatusChart
 *
 * Donut chart showing order count distribution by financial status.
 * Status colors: PAID=#10b981, PENDING=#d4a843, REFUNDED=#ef4444, OTHER=#6b7280
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export type OrderStatusDataPoint = {
  name: string;
  value: number;
};

const STATUS_COLORS: Record<string, string> = {
  PAID: '#10b981',
  PENDING: '#d4a843',
  REFUNDED: '#ef4444',
  VOIDED: '#6b8cff',
  PARTIALLY_PAID: '#f59e0b',
  PARTIALLY_REFUNDED: '#f97316',
  OTHER: '#6b7280',
};

function getStatusColor(name: string): string {
  return STATUS_COLORS[name.toUpperCase()] ?? STATUS_COLORS.OTHER;
}

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[#6b7280] text-xs mb-1">{item.name}</p>
      <p className="text-white font-semibold text-sm">{item.value.toLocaleString()} orders</p>
    </div>
  );
}

type OrderStatusChartProps = {
  data: OrderStatusDataPoint[];
};

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[220px]">
        <p className="text-[#6b7280] text-sm">No order data</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={getStatusColor(entry.name)} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span style={{ color: '#9ca3af', fontSize: 11 }}>
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
