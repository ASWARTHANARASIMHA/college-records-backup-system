import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatBytes } from '../../services/crypto';

interface StorageUtilizationChartProps {
  categoryBreakdown: { [category: string]: number };
  totalBytes: number;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const StorageUtilizationChart: React.FC<StorageUtilizationChartProps> = ({
  categoryBreakdown,
  totalBytes
}) => {
  const data = Object.keys(categoryBreakdown).map((cat) => ({
    name: cat,
    value: categoryBreakdown[cat]
  }));

  if (data.length === 0 || totalBytes === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No storage data available to display.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percent = totalBytes > 0 ? ((item.value / totalBytes) * 100).toFixed(1) : 0;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs border border-slate-700">
          <p className="font-bold text-slate-200">{item.name}</p>
          <p className="text-emerald-400 mt-0.5 font-mono">
            {formatBytes(item.value)} ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => <span className="text-[11px] text-slate-600 font-medium">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
