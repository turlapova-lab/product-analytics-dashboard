import React from 'react';
import { DailyDataPoint, MonthlyChartPoint, RetentionPoint } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { TrendingUp, BarChart2, MessageSquare, Repeat, Layers, Search, ShieldCheck, Calendar } from 'lucide-react';

interface ChartsGridProps {
  dailyData: DailyDataPoint[];
  monthlyChartData: MonthlyChartPoint[];
  retentionData: RetentionPoint[];
  startDate: string;
  endDate: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  onPresetDateRange?: (preset: 'all' | '3m' | '6m' | 'month') => void;
  onResetDates?: () => void;
}

export const ChartsGrid: React.FC<ChartsGridProps> = ({
  dailyData,
  monthlyChartData,
  retentionData,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onPresetDateRange,
  onResetDates,
}) => {
  // Filter daily trend data by Date Range filter
  const filteredDailyRaw = dailyData.filter((d) => {
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    return true;
  });

  // Safe fallback if filter yields 0 items so charts NEVER collapse to empty
  const filteredDaily = filteredDailyRaw.length > 0 ? filteredDailyRaw : dailyData;
  const isDailyFilteredOut = filteredDailyRaw.length === 0 && dailyData.length > 0;

  // Filter monthly chart data by Date Range filter
  const filteredMonthlyRaw = monthlyChartData.filter((m) => {
    if (!m.monthKey) return true;
    const startMonth = startDate ? startDate.slice(0, 7) : '';
    const endMonth = endDate ? endDate.slice(0, 7) : '';
    if (startMonth && m.monthKey < startMonth) return false;
    if (endMonth && m.monthKey > endMonth) return false;
    return true;
  });

  const filteredMonthlyChart = filteredMonthlyRaw.length > 0 ? filteredMonthlyRaw : monthlyChartData;

  const safeFormatNum = (v: any) => {
    const num = Number(v);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDateTick = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (mIdx >= 0 && mIdx < 12) {
        return `${day} ${months[mIdx]}`;
      }
    }
    return dateStr;
  };

  // Custom sleek tooltip for recharts
  const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
    if (active && payload && payload.length) {
      const formattedLabel = label && /^\d{4}-\d{2}-\d{2}$/.test(String(label)) ? formatDateTick(String(label)) : label;
      return (
        <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg shadow-lg text-xs border border-slate-700/80 backdrop-blur-xs">
          <div className="font-semibold text-slate-300 mb-1">{formattedLabel}</div>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) {
              return (
                <div key={index} className="flex items-center gap-2 text-slate-400 font-medium">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color || entry.fill }}
                  />
                  <span>{entry.name || 'Value'}:</span>
                  <span className="font-bold text-slate-400">—</span>
                </div>
              );
            }
            const valNum = Number(entry.value);
            const displayVal = !isNaN(valNum)
              ? unit === '%'
                ? valNum.toFixed(2)
                : !Number.isInteger(valNum)
                  ? valNum.toFixed(2)
                  : safeFormatNum(valNum)
              : entry.value;

            return (
              <div key={index} className="flex items-center gap-2 text-white font-medium">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                <span>{entry.name || 'Value'}:</span>
                <span className="font-bold text-emerald-400">
                  {displayVal}
                  {unit}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const year = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (mIdx >= 0 && mIdx < 12) {
        return `${day} ${months[mIdx]} ${year}`;
      }
    }
    return dateStr;
  };

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Metrics Trends
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Selected period: <span className="font-semibold text-slate-700">{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>
            </p>
          </div>

          {/* TRENDS PERIOD CONTROL */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="font-semibold text-slate-700 uppercase text-[10px] tracking-wider whitespace-nowrap">Period:</span>
              {onPresetDateRange && (
                <div className="flex items-center gap-1 text-xs text-slate-500 ml-1">
                  <button
                    onClick={() => onPresetDateRange('all')}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    All
                  </button>
                  <button
                    onClick={() => onPresetDateRange('3m')}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    3M
                  </button>
                  <button
                    onClick={() => onPresetDateRange('6m')}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    6M
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Start Date */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange && onStartDateChange(e.target.value)}
                    className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <span className="text-slate-400 font-medium text-center hidden sm:inline">—</span>

              {/* End Date */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
                    className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning banner if selected dates yielded no points */}
      {isDailyFilteredOut && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div>
            <span className="font-bold">Выбранный период выходит за границы данных: </span>
            <span>
              Для диапазона с <strong>{startDate}</strong> по <strong>{endDate}</strong> данные не найдены. Выведены имеющиеся данные ({dailyData[0]?.date} — {dailyData[dailyData.length - 1]?.date}).
            </span>
          </div>
          {onResetDates && (
            <button
              onClick={onResetDates}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
            >
              Сбросить фильтр дат
            </button>
          )}
        </div>
      )}

      {/* Row 1: DAU Trend (Daily Line) & MAU Trend (Monthly Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. DAU Trend */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  DAU Trend
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Daily
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily active users in selected date range
            </p>
          </div>

          <div className="w-full min-h-[240px]">
            <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={180}>
              <LineChart data={filteredDaily} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={formatDateTick}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="dau"
                  name="DAU"
                  stroke="#0284C7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#0284C7', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. MAU Trend (Monthly Bar Chart with values on top) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  MAU Trend
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Monthly
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Monthly active users in selected date range
            </p>
          </div>

          <div className="w-full min-h-[240px]">
            <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={180}>
              <BarChart data={filteredMonthlyChart} margin={{ top: 25, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="mau" name="MAU" fill="#0F766E" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="mau"
                    position="top"
                    formatter={(v: any) => safeFormatNum(v)}
                    style={{ fontSize: '10px', fontWeight: '600', fill: '#0F766E' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: AI Queries Trend (Daily Line) & Stickiness Trend (Monthly Line from Dashboard_Helper) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 3. AI Queries Trend */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  AI Queries Trend
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Daily
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total AI queries in selected date range
            </p>
          </div>

          <div className="w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={180}>
              <LineChart data={filteredDaily} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={formatDateTick}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="queries"
                  name="AI Queries"
                  stroke="#4338CA"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Stickiness Trend */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Stickiness Trend
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Monthly
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Share of monthly active users who use AI Search on an average day (avg DAU / MAU)
            </p>
          </div>

          <div className="w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={180}>
              <LineChart data={filteredMonthlyChart} margin={{ top: 25, right: 15, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Line
                  type="monotone"
                  dataKey="stickiness"
                  name="Stickiness"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: '#D97706', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                >
                  <LabelList
                    dataKey="stickiness"
                    position="top"
                    formatter={(v: any) => (v === null || v === undefined || isNaN(Number(v))) ? '' : `${Number(v).toFixed(2)}%`}
                    style={{ fontSize: '11px', fontWeight: '700', fill: '#B45309' }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Queries per user, Sessions per user, Queries per session (Daily Lines) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 5. Queries per User Trend */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Queries per User Trend
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Daily
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Average AI queries per active user
            </p>
          </div>

          <div className="w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={160}>
              <LineChart data={filteredDaily} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: '#64748B' }}
                  tickFormatter={formatDateTick}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={40}
                />
                <YAxis domain={[0, 8]} tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="queriesPerUser"
                  name="Queries / User"
                  stroke="#EAB308"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Sessions per User Trend */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Sessions per User Trend
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Daily
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Average sessions per active user
            </p>
          </div>

          <div className="w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={160}>
              <LineChart data={filteredDaily} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: '#64748B' }}
                  tickFormatter={formatDateTick}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={40}
                />
                <YAxis domain={[0, 4]} tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="sessionsPerUser"
                  name="Sessions / User"
                  stroke="#9333EA"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Queries per Session Trend */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Queries per Session Trend
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Daily
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Average AI queries per session
            </p>
          </div>

          <div className="w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={160}>
              <LineChart data={filteredDaily} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: '#64748B' }}
                  tickFormatter={formatDateTick}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={40}
                />
                <YAxis domain={[0, 6]} tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="queriesPerSession"
                  name="Queries / Session"
                  stroke="#E11D48"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 4: Retention (1/3/7/14/30d) with value labels on points */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Rolling Retention (1/3/7/14/30d)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Rolling retention по возврату: пользователь считается удержанным, если возвращается к AI Search хотя бы один раз в течение N дней после первого использования.
          </p>
        </div>

        <div className="w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={180}>
            <LineChart data={retentionData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fontWeight: '600', fill: '#475569' }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Line
                type="monotone"
                dataKey="value"
                name="Retention"
                stroke="#6366F1"
                strokeWidth={2.5}
                dot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: any) => isNaN(Number(v)) ? '' : `${Number(v).toFixed(2)}%`}
                  style={{ fontSize: '11px', fontWeight: '700', fill: '#4338CA' }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </section>
  );
};
