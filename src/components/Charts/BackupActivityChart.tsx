import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DbBackup } from '../../types';

interface BackupActivityChartProps {
  backups: DbBackup[];
}

export const BackupActivityChart: React.FC<BackupActivityChartProps> = ({ backups }) => {
  // Aggregate backups by category or date
  const categoryCount: { [cat: string]: { category: string; manual: number; automatic: number } } = {};

  backups.forEach((b) => {
    const cat = b.category || 'General';
    if (!categoryCount[cat]) {
      categoryCount[cat] = { category: cat.replace(' Records', '').replace(' Sheets', '').replace(' Documents', ''), manual: 0, automatic: 0 };
    }
    if (b.backup_type === 'AUTOMATIC') {
      categoryCount[cat].automatic += 1;
    } else {
      categoryCount[cat].manual += 1;
    }
  });

  const data = Object.values(categoryCount);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No backup activity recorded yet.
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc', fontSize: '11px' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="manual" name="Manual Backups" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="automatic" name="Auto Backups" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
