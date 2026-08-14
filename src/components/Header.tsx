import React from 'react';
import { DashboardConfig } from '../types';
import { LayoutDashboard, RefreshCw, Settings, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  dashboards: DashboardConfig[];
  selectedDashboardId: string;
  onSelectDashboard: (id: string) => void;
  onRefreshData: () => void;
  isLoading: boolean;
  onOpenAdmin: () => void;
  isError?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  dashboards,
  selectedDashboardId,
  onSelectDashboard,
  onRefreshData,
  isLoading,
  onOpenAdmin,
  isError,
}) => {
  const selectedDash = dashboards.find((d) => d.id === selectedDashboardId) || dashboards[0];

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Title and Dashboard Dropdown */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold text-lg shadow-xs border border-emerald-500/20">
            <LayoutDashboard className="w-5 h-5 text-emerald-700" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Analytics</h1>
          </div>

          {/* Active Dashboard Dropdown Selector */}
          <div className="relative ml-0 sm:ml-4">
            <div className="flex items-center gap-1.5 bg-slate-100/80 rounded-xl p-1 border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 pl-2.5">Dashboard:</span>
              <div className="relative inline-block">
                <select
                  value={selectedDashboardId}
                  onChange={(e) => onSelectDashboard(e.target.value)}
                  className="appearance-none bg-white font-bold text-slate-900 text-xs py-1.5 pl-3 pr-8 rounded-lg border border-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-xs"
                >
                  {dashboards.map((dash) => (
                    <option key={dash.id} value={dash.id}>
                      {dash.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Active Connection Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isError ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
            {isError ? (
              <span className="text-rose-700 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Ошибка загрузки
              </span>
            ) : (
              <span className="text-slate-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Подключён ({selectedDash?.name || 'AI Search'})
              </span>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefreshData}
            disabled={isLoading}
            className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            title="Обновить данные из Google Таблицы"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden md:inline font-semibold">Обновить</span>
          </button>

          {/* Admin Panel Button */}
          <button
            onClick={onOpenAdmin}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Открыть панель администратора (/admin)"
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
