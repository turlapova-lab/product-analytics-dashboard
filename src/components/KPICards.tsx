import React from 'react';
import { CalcDataPoint, KPIMetric } from '../types';
import { TrendingUp, TrendingDown, Users, Search, Activity, Layers, MessageSquare, Repeat, ArrowRightLeft, RotateCcw } from 'lucide-react';

interface KPICardsProps {
  calcData: CalcDataPoint[];
  kpiMonth: string;
  compareMonth: string;
  availableMonths?: string[];
  onKpiMonthChange?: (month: string) => void;
  onCompareMonthChange?: (month: string) => void;
  onResetControls?: () => void;
}

export const KPICards: React.FC<KPICardsProps> = ({
  calcData,
  kpiMonth,
  compareMonth,
  availableMonths = [],
  onKpiMonthChange,
  onCompareMonthChange,
  onResetControls,
}) => {
  // Retrieve selected month data from Calc_Data (Source of Truth)
  const currentMonthData = calcData.find((m) => m.month === kpiMonth || m.monthKey === kpiMonth) || calcData[calcData.length - 1];
  const compareMonthData = calcData.find((m) => m.month === compareMonth || m.monthKey === compareMonth) || calcData[Math.max(0, calcData.length - 2)];

  // Helper to compute MoM % change (1 decimal place)
  const calcChange = (curr: number, prev: number) => {
    if (!prev || prev === 0) return 0;
    const diff = ((curr - prev) / prev) * 100;
    return Number(diff.toFixed(1));
  };

  const formatInt = (val: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(val));
  const formatDec2 = (val: number) => (val || 0).toFixed(2);

  // Compute all 7 required KPIs directly from Calc_Data values
  const kpis: KPIMetric[] = [
    {
      key: 'avgDau',
      title: 'Avg DAU',
      description: 'Average daily active users in selected month',
      currentValue: currentMonthData?.avgDau || 0,
      compareValue: compareMonthData?.avgDau || 0,
      changePercent: calcChange(currentMonthData?.avgDau || 0, compareMonthData?.avgDau || 0),
      formattedCurrent: formatInt(currentMonthData?.avgDau || 0),
      formattedCompare: formatInt(compareMonthData?.avgDau || 0),
      formattedChange: `${calcChange(currentMonthData?.avgDau || 0, compareMonthData?.avgDau || 0) >= 0 ? '+' : ''}${calcChange(currentMonthData?.avgDau || 0, compareMonthData?.avgDau || 0).toFixed(1)}%`,
      isPositive: calcChange(currentMonthData?.avgDau || 0, compareMonthData?.avgDau || 0) >= 0,
    },
    {
      key: 'mau',
      title: 'MAU',
      description: 'Monthly active users',
      currentValue: currentMonthData?.mau || 0,
      compareValue: compareMonthData?.mau || 0,
      changePercent: calcChange(currentMonthData?.mau || 0, compareMonthData?.mau || 0),
      formattedCurrent: formatInt(currentMonthData?.mau || 0),
      formattedCompare: formatInt(compareMonthData?.mau || 0),
      formattedChange: `${calcChange(currentMonthData?.mau || 0, compareMonthData?.mau || 0) >= 0 ? '+' : ''}${calcChange(currentMonthData?.mau || 0, compareMonthData?.mau || 0).toFixed(1)}%`,
      isPositive: calcChange(currentMonthData?.mau || 0, compareMonthData?.mau || 0) >= 0,
    },
    {
      key: 'totalQueries',
      title: 'Total AI Queries',
      description: 'Total search & AI queries performed',
      currentValue: currentMonthData?.totalQueries || 0,
      compareValue: compareMonthData?.totalQueries || 0,
      changePercent: calcChange(currentMonthData?.totalQueries || 0, compareMonthData?.totalQueries || 0),
      formattedCurrent: formatInt(currentMonthData?.totalQueries || 0),
      formattedCompare: formatInt(compareMonthData?.totalQueries || 0),
      formattedChange: `${calcChange(currentMonthData?.totalQueries || 0, compareMonthData?.totalQueries || 0) >= 0 ? '+' : ''}${calcChange(currentMonthData?.totalQueries || 0, compareMonthData?.totalQueries || 0).toFixed(1)}%`,
      isPositive: calcChange(currentMonthData?.totalQueries || 0, compareMonthData?.totalQueries || 0) >= 0,
    },
    {
      key: 'stickiness',
      title: 'Stickiness',
      description: 'Avg DAU / MAU ratio (%)',
      currentValue: currentMonthData?.stickiness || 0,
      compareValue: compareMonthData?.stickiness || 0,
      changePercent: calcChange(currentMonthData?.stickiness || 0, compareMonthData?.stickiness || 0),
      formattedCurrent: `${formatDec2(currentMonthData?.stickiness || 0)}%`,
      formattedCompare: `${formatDec2(compareMonthData?.stickiness || 0)}%`,
      formattedChange: `${calcChange(currentMonthData?.stickiness || 0, compareMonthData?.stickiness || 0) >= 0 ? '+' : ''}${calcChange(currentMonthData?.stickiness || 0, compareMonthData?.stickiness || 0).toFixed(1)}%`,
      isPositive: calcChange(currentMonthData?.stickiness || 0, compareMonthData?.stickiness || 0) >= 0,
      unit: '%',
    },
    {
      key: 'queriesPerUser',
      title: 'Queries per User',
      description: 'Average queries per active user',
      currentValue: currentMonthData?.queriesPerUser || 0,
      compareValue: compareMonthData?.queriesPerUser || 0,
      changePercent: calcChange(currentMonthData?.queriesPerUser || 0, compareMonthData?.queriesPerUser || 0),
      formattedCurrent: formatDec2(currentMonthData?.queriesPerUser || 0),
      formattedCompare: formatDec2(compareMonthData?.queriesPerUser || 0),
      formattedChange: `${calcChange(currentMonthData?.queriesPerUser || 0, compareMonthData?.queriesPerUser || 0) >= 0 ? '+' : ''}${calcChange(currentMonthData?.queriesPerUser || 0, compareMonthData?.queriesPerUser || 0).toFixed(1)}%`,
      isPositive: calcChange(currentMonthData?.queriesPerUser || 0, compareMonthData?.queriesPerUser || 0) >= 0,
    },
    {
      key: 'sessionsPerUser',
      title: 'Sessions per User',
      description: 'Average sessions per active user',
      currentValue: currentMonthData?.sessionsPerUser || 0,
      compareValue: compareMonthData?.sessionsPerUser || 0,
      changePercent: calcChange(currentMonthData?.sessionsPerUser || 0, compareMonthData?.sessionsPerUser || 0),
      formattedCurrent: formatDec2(currentMonthData?.sessionsPerUser || 0),
      formattedCompare: formatDec2(compareMonthData?.sessionsPerUser || 0),
      formattedChange: `${calcChange(currentMonthData?.sessionsPerUser || 0, compareMonthData?.sessionsPerUser || 0) >= 0 ? '+' : ''}${calcChange(currentMonthData?.sessionsPerUser || 0, compareMonthData?.sessionsPerUser || 0).toFixed(1)}%`,
      isPositive: calcChange(currentMonthData?.sessionsPerUser || 0, compareMonthData?.sessionsPerUser || 0) >= 0,
    },
    {
      key: 'queriesPerSession',
      title: 'Queries per Session',
      description: 'Average queries per search session',
      currentValue: currentMonthData?.queriesPerSession || 0,
      compareValue: compareMonthData?.queriesPerSession || 0,
      changePercent: calcChange(currentMonthData?.queriesPerSession || 0, compareMonthData?.queriesPerSession || 0),
      formattedCurrent: formatDec2(currentMonthData?.queriesPerSession || 0),
      formattedCompare: formatDec2(compareMonthData?.queriesPerSession || 0),
      formattedChange: `${calcChange(currentMonthData?.queriesPerSession || 0, compareMonthData?.queriesPerSession || 0) >= 0 ? '+' : ''}${calcChange(currentMonthData?.queriesPerSession || 0, compareMonthData?.queriesPerSession || 0).toFixed(1)}%`,
      isPositive: calcChange(currentMonthData?.queriesPerSession || 0, compareMonthData?.queriesPerSession || 0) >= 0,
    },
  ];

  const getIcon = (key: string) => {
    switch (key) {
      case 'avgDau': return <Users className="w-4 h-4 text-emerald-600" />;
      case 'mau': return <Activity className="w-4 h-4 text-teal-600" />;
      case 'totalQueries': return <Search className="w-4 h-4 text-indigo-600" />;
      case 'stickiness': return <Repeat className="w-4 h-4 text-amber-600" />;
      case 'queriesPerUser': return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'sessionsPerUser': return <Layers className="w-4 h-4 text-purple-600" />;
      case 'queriesPerSession': return <TrendingUp className="w-4 h-4 text-rose-600" />;
      default: return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatMonthYear = (mStr?: string) => {
    if (!mStr) return '';
    const clean = mStr.trim();
    const parts = clean.split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10) - 1;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthNum >= 0 && monthNum < 12) {
        return `${months[monthNum]} ${year}`;
      }
    }
    return mStr;
  };

  return (
    <section className="mb-8">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                MoM Metrics
              </h2>
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              {formatMonthYear(currentMonthData?.month || kpiMonth)} vs {formatMonthYear(compareMonthData?.month || compareMonth)}
            </p>
          </div>

          {/* MoM Comparison Control */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium px-1">
              <span className="font-semibold text-slate-700 uppercase text-[10px] tracking-wider whitespace-nowrap">MoM Comparison:</span>
            </div>

            {/* KPI Month Selector */}
            <div className="flex flex-col bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all min-w-[120px]">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">MONTH</label>
              <select
                value={kpiMonth}
                onChange={(e) => onKpiMonthChange && onKpiMonthChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-center text-slate-400 shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Compare with Selector */}
            <div className="flex flex-col bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all min-w-[120px]">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">COMPARE WITH</label>
              <select
                value={compareMonth}
                onChange={(e) => onCompareMonthChange && onCompareMonthChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === kpiMonth ? '(Same)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            {onResetControls && (
              <button
                onClick={onResetControls}
                className="text-[11px] text-slate-500 hover:text-slate-800 px-2 py-1.5 flex items-center gap-1 font-medium transition-colors border border-slate-200/80 rounded-lg bg-white shrink-0"
                title="Reset comparison defaults"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of 7 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const isUp = kpi.isPositive;
          const isZero = kpi.changePercent === 0;

          return (
            <div
              key={kpi.key}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 tracking-tight flex items-center gap-1.5">
                    {getIcon(kpi.key)}
                    {kpi.title}
                  </span>

                  {/* MoM Change Badge */}
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isZero
                        ? 'bg-slate-100 text-slate-600'
                        : isUp
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    }`}
                  >
                    {!isZero && (isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                    {kpi.formattedChange}
                  </span>
                </div>

                {/* Primary Metric Value */}
                <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                  {kpi.formattedCurrent}
                </div>
              </div>

              {/* Comparison baseline line */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Vs {compareMonthData?.month || compareMonth}:</span>
                <span className="font-medium text-slate-700">{kpi.formattedCompare}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
