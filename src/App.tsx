import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedDataset, DashboardConfig } from './types';
import { EMPTY_DATASET } from './data/mockData';
import { fetchGoogleSheetData } from './services/sheetsService';
import { fetchDashboards } from './services/dashboardsService';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { ChartsGrid } from './components/ChartsGrid';
import { AdminPanel } from './components/AdminPanel';
import { ErrorDisplay } from './components/ErrorDisplay';
import { RefreshCw } from 'lucide-react';

export default function App() {
  // Navigation Route state ('app' or 'admin')
  const [currentRoute, setCurrentRoute] = useState<'app' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin' || hash === '#/admin' || hash === '#admin') {
        return 'admin';
      }
    }
    return 'app';
  });

  // Sync hash/URL with route
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (path === '/admin' || hash === '#/admin' || hash === '#admin') {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('app');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToAdmin = () => {
    window.location.hash = '/admin';
    setCurrentRoute('admin');
  };

  const navigateToApp = () => {
    window.location.hash = '/';
    setCurrentRoute('app');
  };

  // Dashboard configuration list & selection
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>(() => {
    return localStorage.getItem('selected_dashboard_id') || 'ai-search';
  });
  const [isLoadingDashboards, setIsLoadingDashboards] = useState<boolean>(true);

  // Dataset & Loading State
  const [dataset, setDataset] = useState<ProcessedDataset>(EMPTY_DATASET);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // 1. Load active dashboards list
  const loadDashboardsList = async () => {
    setIsLoadingDashboards(true);
    try {
      const activeDashboards = await fetchDashboards(false);
      if (activeDashboards && activeDashboards.length > 0) {
        setDashboards(activeDashboards);
        // If currently selected ID is not in active list, default to first active
        if (!activeDashboards.some((d) => d.id === selectedDashboardId)) {
          setSelectedDashboardId(activeDashboards[0].id);
          localStorage.setItem('selected_dashboard_id', activeDashboards[0].id);
        }
      } else {
        // Fallback default config if server returns empty list
        const defaultDash: DashboardConfig = {
          id: 'ai-search',
          name: 'AI Search',
          spreadsheetId: '1xqb53jMewcKORMcKgyy2qqcyAUpsLBElVbN7Nzz2VUA',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setDashboards([defaultDash]);
        setSelectedDashboardId('ai-search');
      }
    } catch (err) {
      console.warn('Failed to load dashboards list:', err);
    } finally {
      setIsLoadingDashboards(false);
    }
  };

  useEffect(() => {
    loadDashboardsList();
  }, []);

  // Handle selecting a dashboard from header dropdown
  const handleSelectDashboard = (id: string) => {
    setSelectedDashboardId(id);
    localStorage.setItem('selected_dashboard_id', id);
  };

  // Get selected dashboard object
  const selectedDashboard = useMemo(() => {
    return dashboards.find((d) => d.id === selectedDashboardId) || dashboards[0];
  }, [dashboards, selectedDashboardId]);

  // 2. Load dataset when selected dashboard changes or on manual refresh
  const loadDataset = async () => {
    if (!selectedDashboard) return;

    setIsLoadingData(true);
    setDataError(null);

    const targetSpreadsheetId = selectedDashboard.spreadsheetId;

    if (!targetSpreadsheetId) {
      setIsLoadingData(false);
      setDataError(
        `Google Sheet URL не привязан к дашборду "${selectedDashboard.name}". Администратор должен указать ссылку на Google Таблицу в Admin-панели.`
      );
      setDataset(EMPTY_DATASET);
      return;
    }

    try {
      const newDataset = await fetchGoogleSheetData(targetSpreadsheetId);
      setDataset(newDataset);
      setDataError(null);
    } catch (err: any) {
      console.error('Dataset fetch error:', err);
      setDataError(err.message || 'Не удалось загрузить данные из Google Таблицы.');
      setDataset(EMPTY_DATASET);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedDashboard) {
      loadDataset();
    }
  }, [selectedDashboardId, selectedDashboard?.spreadsheetId]);

  // --- CONTROLS STATE & LOGIC ---
  // Trend Period Controls (Start & End dates)
  const [startDate, setStartDate] = useState<string>('2025-09-18');
  const [endDate, setEndDate] = useState<string>('2026-03-31');

  // Sync Start Date and End Date whenever dailyData is loaded
  useEffect(() => {
    if (dataset.dailyData.length > 0) {
      const minDate = dataset.dailyData[0].date;
      const maxDate = dataset.dailyData[dataset.dailyData.length - 1].date;
      if (minDate && maxDate) {
        setStartDate(minDate);
        setEndDate(maxDate);
      }
    }
  }, [dataset.dailyData]);

  // Derived available months from calcData (canonical source for KPI)
  const availableMonths = useMemo(() => {
    if (dataset.calcData && dataset.calcData.length > 0) {
      return dataset.calcData.map((c) => c.monthKey || c.month).filter(Boolean);
    }
    return dataset.monthlyData.map((m) => m.month).filter(Boolean);
  }, [dataset.calcData, dataset.monthlyData]);

  // KPI Controls
  const [kpiMonth, setKpiMonth] = useState<string>('');
  const [compareMonth, setCompareMonth] = useState<string>('');

  // Default KPI month to last available month and Compare month to penultimate month
  useEffect(() => {
    if (availableMonths.length > 0) {
      const lastMonth = availableMonths[availableMonths.length - 1];
      const penultimateMonth = availableMonths.length > 1
        ? availableMonths[availableMonths.length - 2]
        : availableMonths[0];
      setKpiMonth(lastMonth);
      setCompareMonth(penultimateMonth);
    }
  }, [availableMonths]);

  // Automatically update Compare Month when KPI month changes
  const handleKpiMonthChange = (newMonth: string) => {
    setKpiMonth(newMonth);
    const idx = availableMonths.indexOf(newMonth);
    if (idx > 0) {
      setCompareMonth(availableMonths[idx - 1]);
    } else if (availableMonths.length > 1) {
      setCompareMonth(availableMonths[1]);
    }
  };

  // Date Range preset helper
  const handlePresetDateRange = (preset: 'all' | '3m' | '6m' | 'month') => {
    if (dataset.dailyData.length === 0) return;
    const minDate = dataset.dailyData[0].date;
    const maxDate = dataset.dailyData[dataset.dailyData.length - 1].date;

    if (preset === 'all') {
      setStartDate(minDate);
      setEndDate(maxDate);
      return;
    }

    const end = new Date(maxDate);
    let start = new Date(maxDate);

    if (preset === '3m') {
      start.setMonth(start.getMonth() - 3);
    } else if (preset === '6m') {
      start.setMonth(start.getMonth() - 6);
    } else if (preset === 'month') {
      start.setMonth(start.getMonth() - 1);
    }

    const startStr = start.toISOString().split('T')[0];
    setStartDate(startStr < minDate ? minDate : startStr);
    setEndDate(maxDate);
  };

  // Reset controls
  const handleResetControls = () => {
    if (dataset.dailyData.length > 0) {
      setStartDate(dataset.dailyData[0].date);
      setEndDate(dataset.dailyData[dataset.dailyData.length - 1].date);
    }
    if (availableMonths.length > 0) {
      const lastMonth = availableMonths[availableMonths.length - 1];
      const penultimateMonth = availableMonths.length > 1
        ? availableMonths[availableMonths.length - 2]
        : availableMonths[0];
      setKpiMonth(lastMonth);
      setCompareMonth(penultimateMonth);
    }
  };

  // Render Admin Panel if on Admin route
  if (currentRoute === 'admin') {
    return <AdminPanel onBackToApp={navigateToApp} />;
  }

  // Render Main Dashboard App View
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header Bar */}
      <Header
        dashboards={dashboards}
        selectedDashboardId={selectedDashboardId}
        onSelectDashboard={handleSelectDashboard}
        onRefreshData={loadDataset}
        isLoading={isLoadingData || isLoadingDashboards}
        onOpenAdmin={navigateToAdmin}
        isError={!!dataError}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Loading Spinner State */}
        {isLoadingData && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-bold text-slate-600">
              Загрузка данных из Google Таблицы ({selectedDashboard?.name})...
            </p>
          </div>
        )}

        {/* Error State (If spreadsheet unavailable or not configured) */}
        {!isLoadingData && dataError && (
          <ErrorDisplay
            dashboardName={selectedDashboard?.name || 'AI Search'}
            errorMessage={dataError}
            onRetry={loadDataset}
            onOpenAdmin={navigateToAdmin}
            isRetrying={isLoadingData}
          />
        )}

        {/* Working Dashboard Display (When Data Loaded Successfully) */}
        {!isLoadingData && !dataError && (
          <>
            {/* 7 Required KPI Cards with embedded KPI Month & Comparison controls */}
            <KPICards
              calcData={dataset.calcData}
              kpiMonth={kpiMonth}
              compareMonth={compareMonth}
              availableMonths={availableMonths}
              onKpiMonthChange={handleKpiMonthChange}
              onCompareMonthChange={setCompareMonth}
              onResetControls={handleResetControls}
            />

            {/* Interactive Charts Grid with embedded Trends Period controls */}
            <ChartsGrid
              dailyData={dataset.dailyData}
              monthlyChartData={dataset.monthlyChartData}
              retentionData={dataset.retentionData}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onPresetDateRange={handlePresetDateRange}
              onResetDates={handleResetControls}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>AI Search Product Analytics &copy; 2026</span>
        </div>
      </footer>
    </div>
  );
}
