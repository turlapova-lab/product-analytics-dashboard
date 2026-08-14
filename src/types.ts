export interface DailyDataPoint {
  date: string; // YYYY-MM-DD
  dau: number;
  queries: number;
  sessions?: number;
  queriesPerUser?: number;
  sessionsPerUser?: number;
  queriesPerSession?: number;
  stickiness?: number;
}

export interface MonthlyChartPoint {
  month: string; // Display string, e.g. "2025-09" or "Dec 2025"
  monthKey: string; // "YYYY-MM" for filtering by range
  mau: number;
  stickiness: number; // e.g. 3.62
}

export interface CalcDataPoint {
  month: string; // Display string, e.g. "2026-01" or "Jan 2026"
  monthKey: string; // "YYYY-MM" for KPI month matching
  avgDau: number;
  mau: number;
  totalQueries: number;
  stickiness: number; // e.g. 3.65
  queriesPerUser: number;
  sessionsPerUser: number;
  queriesPerSession: number;
}

export interface MonthlyDataPoint {
  month: string; // YYYY-MM or "2025-09"
  monthKey?: string;
  mau: number;
  avgDau: number;
  totalQueries: number;
  totalSessions: number;
  stickiness: number; // e.g. 3.53 (% or decimal)
  queriesPerUser: number;
  sessionsPerUser: number;
  queriesPerSession: number;
}

export interface RetentionPoint {
  window: '1d' | '3d' | '7d' | '14d' | '30d';
  label: string; // '1d', '3d', etc.
  value: number; // percentage (e.g. 33.37)
  cohortDate?: string;
}

export interface KPIMetric {
  key: string;
  title: string;
  description: string;
  currentValue: number;
  compareValue: number;
  changePercent: number; // e.g. 13.0 for +13%
  formattedCurrent: string;
  formattedCompare: string;
  formattedChange: string;
  isPositive: boolean;
  unit?: string;
}

export interface DashboardConfig {
  id: string;
  name: string;
  spreadsheetId: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  sheetNames?: string[];
  missingSheets?: string[];
  missingHeaders?: Record<string, string[]>;
  details?: string;
}

export interface SheetSourceConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  isCustom: boolean;
  title: string;
  lastFetched?: string;
  availableSheets: string[];
  error?: string | null;
}

export interface ProcessedDataset {
  dailyData: DailyDataPoint[];
  monthlyChartData: MonthlyChartPoint[];
  calcData: CalcDataPoint[];
  monthlyData: MonthlyDataPoint[];
  retentionData: RetentionPoint[];
  source: SheetSourceConfig;
}
