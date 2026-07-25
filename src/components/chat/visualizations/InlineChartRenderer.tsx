import React, { useState } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Download } from 'lucide-react';
import { toast } from 'sonner';

export type ChartType = 'bar' | 'line' | 'area' | 'pie';

export interface ChartDataPoint {
  name?: string;
  [key: string]: any;
}

export interface InlineChartConfig {
  title?: string;
  type?: ChartType;
  data: ChartDataPoint[];
  dataKeys: { key: string; color?: string; name?: string }[];
  xAxisKey?: string;
  height?: number;
}

const DEFAULT_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'
];

export const InlineChartComponent: React.FC<InlineChartConfig> = ({
  title,
  type: initialType = 'bar',
  data,
  dataKeys,
  xAxisKey = 'name',
  height = 280
}) => {
  const [chartType, setChartType] = useState<ChartType>(initialType);

  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(title || 'chart_data').toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV dataset exported successfully");
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
            {dataKeys.map((dk, i) => (
              <Line 
                key={dk.key} 
                type="monotone" 
                dataKey={dk.key} 
                name={dk.name || dk.key} 
                stroke={dk.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} 
                strokeWidth={2.5}
                dot={{ r: 4, fill: dk.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
            {dataKeys.map((dk, i) => {
              const color = dk.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
              return (
                <Area 
                  key={dk.key} 
                  type="monotone" 
                  dataKey={dk.key} 
                  name={dk.name || dk.key} 
                  stroke={color} 
                  fill={color}
                  fillOpacity={0.25}
                />
              );
            })}
          </AreaChart>
        );
      case 'pie':
        const primaryKey = dataKeys[0]?.key || 'value';
        return (
          <PieChart>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
            <Pie
              data={data}
              dataKey={primaryKey}
              nameKey={xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={85}
              innerRadius={45}
              paddingAngle={4}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
            {dataKeys.map((dk, i) => (
              <Bar 
                key={dk.key} 
                dataKey={dk.key} 
                name={dk.name || dk.key} 
                fill={dk.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} 
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="my-4 rounded-xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-lg backdrop-blur-md transition-all hover:border-indigo-500/40">
      {/* Header Controls */}
      <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-400" />
          {title || 'Data Visualisation'}
        </h4>

        <div className="flex items-center gap-1.5">
          {/* Chart Type Toggles */}
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700/50">
            <button
              onClick={() => setChartType('bar')}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                chartType === 'bar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                chartType === 'line' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Line Chart"
            >
              <LineChartIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                chartType === 'pie' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pie Chart"
            >
              <PieChartIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700 hover:text-white"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Chart Viewport */}
      <div className="w-full pt-1" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const InlineChartRenderer = React.memo(InlineChartComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.height === nextProps.height &&
    prevProps.type === nextProps.type &&
    prevProps.xAxisKey === nextProps.xAxisKey &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
    JSON.stringify(prevProps.dataKeys) === JSON.stringify(nextProps.dataKeys)
  );
});
