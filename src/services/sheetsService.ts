import {
  DailyDataPoint,
  MonthlyDataPoint,
  MonthlyChartPoint,
  CalcDataPoint,
  RetentionPoint,
  ProcessedDataset,
  SheetSourceConfig,
} from '../types';

/**
 * Extracts Google Spreadsheet ID from various string formats (full URL or plain ID)
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();
  
  // Matches .../spreadsheets/d/SPREADSHEET_ID/...
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  
  // If user entered just the ID directly (alphanumeric string with dashes/underscores)
  if (/^[a-zA-Z0-9-_]{20,80}$/.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

export interface UserDriveSheet {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Fetch user's Google Spreadsheets from Google Drive API using access token
 */
export async function fetchUserDriveSheets(accessToken: string): Promise<UserDriveSheet[]> {
  if (!accessToken) return [];
  try {
    const url = `https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application%2Fvnd.google-apps.spreadsheet'%20and%20trashed%3Dfalse&fields=files(id%2Cname%2CmodifiedTime%2CwebViewLink)&orderBy=modifiedByMeTime%20desc&pageSize=15`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      console.warn('Drive API error:', res.status, res.statusText);
      return [];
    }
    const json = await res.json();
    return json.files || [];
  } catch (err) {
    console.error('Error listing user drive sheets:', err);
    return [];
  }
}

/**
 * Helper to parse clean number from string (e.g. "23,829", "16%", "3.53", "33.37%")
 */
export function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  
  let str = String(val).trim().replace(/[\s\xa0]/g, ''); // remove spaces
  let isPercent = false;
  
  if (str.endsWith('%')) {
    isPercent = true;
    str = str.slice(0, -1);
  }
  
  // handle European decimal comma if no dots
  if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  } else if (str.includes(',') && str.includes('.')) {
    // e.g. "1,234.56" -> remove comma
    str = str.replace(/,/g, '');
  }

  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return isPercent ? Number((num > 1 ? num : num * 100).toFixed(2)) : num;
}

/**
 * Normalizes date string to YYYY-MM-DD
 */
export function parseDate(
  val: any,
  context?: { defaultYear?: number; currentYear?: number; lastMonth?: number }
): string {
  if (!val) return '';
  const str = String(val).trim();

  // 1. ISO date YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss... or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // 2. Serial number from Excel / Google Sheets (e.g. 45627 or 45627.5)
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (!isNaN(num) && num > 30000 && num < 70000) {
      const date = new Date((num - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  // 3. Explicit M/D/YYYY or D/M/YYYY or YYYY/M/D or M/D/YY
  const dateParts = str.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/);
  if (dateParts) {
    const [, p1, p2, p3] = dateParts;
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);
    const n3 = parseInt(p3, 10);

    if (p1.length === 4) {
      // YYYY/M/D
      return `${p1}-${String(n2).padStart(2, '0')}-${String(n3).padStart(2, '0')}`;
    } else {
      // M/D/YYYY or D/M/YYYY or M/D/YY
      let year = n3;
      if (year < 100) year += 2000;

      let month = n1;
      let day = n2;

      // If p1 > 12, then p1 is day and p2 is month (D/M/YYYY)
      if (n1 > 12 && n2 <= 12) {
        day = n1;
        month = n2;
      }

      if (month <= 12 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  // 4. Check for month names in English or Russian e.g. "Dec 1", "Jan 15", "1 Dec 2025"
  const monthMap: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    янв: 1, фев: 2, мар: 3, апр: 4, май: 5, июн: 6,
    июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12,
  };

  const lower = str.toLowerCase();
  for (const [mName, mNum] of Object.entries(monthMap)) {
    if (lower.includes(mName)) {
      const dayMatch = str.match(/\b([1-9]|[12]\d|3[01])\b/);
      const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;

      const yearMatch = str.match(/\b(20\d{2})\b/);
      let year: number;

      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      } else if (context) {
        if (context.lastMonth === 12 && mNum === 1) {
          context.currentYear = (context.currentYear || context.defaultYear || 2025) + 1;
        }
        context.lastMonth = mNum;
        year = context.currentYear || context.defaultYear || 2025;
      } else {
        year = mNum === 12 ? 2025 : 2026;
      }

      return `${year}-${String(mNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 5. Native Date fallback with UTC extraction
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const da = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    }
  } catch {
    // ignore
  }

  return str;
}

/**
 * Normalizes month string to display string and canonical key (YYYY-MM)
 */
export function parseMonth(val: any): { display: string; key: string } {
  if (!val) return { display: '', key: '' };
  const str = String(val).trim();
  
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthNum = isoMatch[2].padStart(2, '0');
    return {
      display: `${year}-${monthNum}`,
      key: `${year}-${monthNum}`,
    };
  }

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    янв: '01', фев: '02', мар: '03', апр: '04', май: '05', июн: '06',
    июл: '07', авг: '08', сен: '09', окт: '10', ноя: '11', дек: '12',
  };

  const lower = str.toLowerCase();
  for (const [mName, mNum] of Object.entries(monthMap)) {
    if (lower.includes(mName)) {
      const yearMatch = str.match(/\d{4}/);
      if (yearMatch) {
        return {
          display: str,
          key: `${yearMatch[0]}-${mNum}`,
        };
      }
    }
  }

  return { display: str, key: str.slice(0, 7) };
}

function findHeaderRowIndex(
  rows: any[][],
  requiredKeywords: string[]
): { headerIndex: number; headers: string[] } {
  if (!rows || rows.length === 0) return { headerIndex: 0, headers: [] };
  const candidateRows = rows.slice(0, 25);
  let bestIndex = -1;
  let maxMatches = 0;

  for (let r = 0; r < candidateRows.length; r++) {
    const row = candidateRows[r] || [];
    const cellStrs = row.map((c) =>
      String(c || '')
        .replace(/canonical input sheet[^\n]*\./gi, '')
        .trim()
        .toLowerCase()
    );
    let matches = 0;
    for (const kw of requiredKeywords) {
      const kwClean = kw.trim().toLowerCase();
      if (
        cellStrs.some((c) => {
          if (!c) return false;
          if (c === kwClean) return true;
          if (c.replace(/[/_-]/g, ' ') === kwClean.replace(/[/_-]/g, ' ')) return true;
          if (kwClean.length >= 3 && (c.includes(kwClean) || kwClean.includes(c))) return true;
          return false;
        })
      ) {
        matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestIndex = r;
    }
  }

  if (bestIndex === -1) {
    bestIndex = 0;
  }

  const selectedRow = rows[bestIndex] || [];
  return {
    headerIndex: bestIndex,
    headers: selectedRow.map((c) =>
      String(c || '')
        .replace(/canonical input sheet[^\n]*\./gi, '')
        .trim()
        .toLowerCase()
    ),
  };
}

/**
 * Parses Calc_Data sheet - Canonical source of truth for KPI Cards
 */
export function parseCalcDataSheet(rows: any[][]): CalcDataPoint[] {
  if (!rows || rows.length < 2) return [];

  let { headerIndex, headers } = findHeaderRowIndex(rows, [
    'month', 'месяц', 'dau', 'mau', 'queries'
  ]);

  const findIdx = (keywords: string[]) => 
    headers.findIndex((h) => keywords.some((kw) => h.includes(kw.toLowerCase())));

  let monthIdx = findIdx(['month', 'месяц', 'period', 'период']);
  let avgDauIdx = findIdx(['avg dau', 'average dau', 'avg_dau', 'среднее dau', 'средн', 'dau']);
  let mauIdx = findIdx(['mau', 'мау']);
  let queriesIdx = findIdx(['total ai queries', 'total queries', 'ai queries', 'queries', 'запрос']);
  let stickIdx = findIdx(['stickiness', 'sticky', 'dau/mau', 'стиккинес', 'липкост']);
  let qpuIdx = findIdx(['queries per user', 'queries/user', 'запросов на польз']);
  let spuIdx = findIdx(['sessions per user', 'sessions/user', 'сессий на польз']);
  let qpsIdx = findIdx(['queries per session', 'queries/session', 'запросов на сесс']);

  // Positional fallback if monthIdx not found
  if (monthIdx === -1) {
    monthIdx = 0;
    avgDauIdx = 1;
    mauIdx = 2;
    queriesIdx = 3;
    stickIdx = 4;
    qpuIdx = 5;
    spuIdx = 6;
    qpsIdx = 7;
    headerIndex = 0;
  }

  const points: CalcDataPoint[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawMonth = monthIdx !== -1 ? row[monthIdx] : row[0];
    const { display: month, key: monthKey } = parseMonth(rawMonth);
    if (!monthKey || monthKey.length < 5) continue;

    let stickiness = stickIdx !== -1 && row[stickIdx] !== undefined ? parseNumber(row[stickIdx]) : 0;
    if (stickiness > 0 && stickiness < 1) {
      stickiness = Number((stickiness * 100).toFixed(2));
    }

    points.push({
      month: month || monthKey,
      monthKey,
      avgDau: avgDauIdx !== -1 ? parseNumber(row[avgDauIdx]) : 0,
      mau: mauIdx !== -1 ? parseNumber(row[mauIdx]) : 0,
      totalQueries: queriesIdx !== -1 ? parseNumber(row[queriesIdx]) : 0,
      stickiness,
      queriesPerUser: qpuIdx !== -1 ? parseNumber(row[qpuIdx]) : 0,
      sessionsPerUser: spuIdx !== -1 ? parseNumber(row[spuIdx]) : 0,
      queriesPerSession: qpsIdx !== -1 ? parseNumber(row[qpsIdx]) : 0,
    });
  }

  return points;
}

export interface DashboardHelperResult {
  dailyData: DailyDataPoint[];
  monthlyChartData: MonthlyChartPoint[];
  retentionData: RetentionPoint[];
}

/**
 * Parses Dashboard_Helper sheet - Primary source for ALL CHARTS
 */
export function parseDashboardHelperSheet(rows: any[][]): DashboardHelperResult {
  if (!rows || rows.length < 1) {
    return { dailyData: [], monthlyChartData: [], retentionData: [] };
  }

  let dateIdx = -1;
  let dauIdx = -1;
  let queriesIdx = -1;
  let qpuIdx = -1;
  let spuIdx = -1;
  let qpsIdx = -1;
  let sessionsIdx = -1;
  let monthIdx = -1;
  let mauIdx = -1;
  let stickIdx = -1;
  let headerIndex = -1;

  // 1. Check if Column 0 is the Primary Date Column (contains valid YYYY-MM-DD or date strings)
  let dateCountInCol0 = 0;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    if (rows[r] && rows[r][0] && parseDate(rows[r][0]).length >= 7) {
      dateCountInCol0++;
    }
  }

  if (dateCountInCol0 >= 2) {
    // Standard layout for Dashboard_Helper
    dateIdx = 0;
    dauIdx = 1;
    sessionsIdx = 2;
    queriesIdx = 3;
    qpuIdx = 4;
    spuIdx = 5;
    qpsIdx = 6;
    monthIdx = 8;
    mauIdx = 9;
    stickIdx = 10;
    headerIndex = -1; // process rows starting from index 0
  } else {
    // Search for header row with keywords
    const headerResult = findHeaderRowIndex(rows, [
      'date', 'dt', 'dau', 'sessions', 'ai queries', 'queries', 'month', 'mau', 'stickiness'
    ]);
    headerIndex = headerResult.headerIndex;
    const headers = headerResult.headers;

    dateIdx = headers.findIndex((h) => h === 'date' || h === 'дата' || h === 'day' || h === 'dt' || h.endsWith('dt'));
    dauIdx = headers.findIndex((h) => h === 'dau' || h.includes('dau'));
    queriesIdx = headers.findIndex((h) => h === 'ai queries' || h === 'ai_queries' || h.includes('queries') || h.includes('запрос'));
    qpuIdx = headers.findIndex((h) => h === 'queries per user' || h === 'queries_per_user' || h.includes('queries/user'));
    spuIdx = headers.findIndex((h) => h === 'sessions per user' || h === 'sessions_per_user' || h.includes('sessions/user'));
    qpsIdx = headers.findIndex((h) => h === 'queries per session' || h === 'queries_per_session' || h.includes('queries/session'));
    sessionsIdx = headers.findIndex((h) => h === 'sessions' || h.includes('session') || h.includes('сесси'));

    monthIdx = headers.findIndex((h, idx) => {
      return idx !== dateIdx && (h === 'month' || h === 'месяц' || h.includes('month') || h.includes('period'));
    });
    mauIdx = headers.findIndex((h) => h === 'mau' || h.includes('mau'));
    stickIdx = headers.findIndex((h) => h === 'stickiness' || h.includes('sticky') || h.includes('dau/mau') || h.includes('стиккинес'));
  }

  const dailyData: DailyDataPoint[] = [];
  const monthlyChartData: MonthlyChartPoint[] = [];
  const dateContext = { defaultYear: 2025, currentYear: 2025, lastMonth: 12 };

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Parse Daily point if row has Date
    if (dateIdx !== -1 && row[dateIdx] !== undefined && row[dateIdx] !== '') {
      const dateStr = parseDate(row[dateIdx], dateContext);
      if (dateStr && dateStr.length >= 7 && !dateStr.toLowerCase().includes('data')) {
        const dau = dauIdx !== -1 ? parseNumber(row[dauIdx]) : 0;
        const queries = queriesIdx !== -1 ? parseNumber(row[queriesIdx]) : 0;
        const sessions = sessionsIdx !== -1 ? parseNumber(row[sessionsIdx]) : 0;

        const qpu = qpuIdx !== -1 && row[qpuIdx] !== undefined ? parseNumber(row[qpuIdx]) : (dau > 0 ? Number((queries / dau).toFixed(2)) : 0);
        const spu = spuIdx !== -1 && row[spuIdx] !== undefined ? parseNumber(row[spuIdx]) : (dau > 0 ? Number((sessions / dau).toFixed(2)) : 0);
        const qps = qpsIdx !== -1 && row[qpsIdx] !== undefined ? parseNumber(row[qpsIdx]) : (sessions > 0 ? Number((queries / sessions).toFixed(2)) : 0);

        dailyData.push({
          date: dateStr,
          dau,
          queries,
          sessions,
          queriesPerUser: qpu,
          sessionsPerUser: spu,
          queriesPerSession: qps,
        });
      }
    }

    // Parse Monthly point if row has Month
    if (monthIdx !== -1 && row[monthIdx] !== undefined && row[monthIdx] !== '') {
      const { display: mName, key: mKey } = parseMonth(row[monthIdx]);
      if (mKey && mKey.length >= 5) {
        let stick = stickIdx !== -1 ? parseNumber(row[stickIdx]) : 0;
        if (stick > 0 && stick < 1) {
          stick = Number((stick * 100).toFixed(2));
        }
        monthlyChartData.push({
          month: mName || mKey,
          monthKey: mKey,
          mau: mauIdx !== -1 ? parseNumber(row[mauIdx]) : 0,
          stickiness: stick,
        });
      }
    }
  }

  // Parse Retention dataset from Dashboard_Helper
  const retentionData = parseRetentionSheet(rows);

  return {
    dailyData: dailyData.sort((a, b) => a.date.localeCompare(b.date)),
    monthlyChartData,
    retentionData,
  };
}

/**
 * Parses raw matrix of values from 'Daily data' sheet tab (fallback)
 */
export function parseDailySheet(rows: any[][], monthlyData?: MonthlyDataPoint[]): DailyDataPoint[] {
  if (!rows || rows.length < 2) return [];
  
  const { headerIndex, headers } = findHeaderRowIndex(rows, [
    'dt', 'date', 'dau', 'sessions', 'ai_queries', 'queries_per_user'
  ]);

  const dateIdx = headers.findIndex((h) => h === 'dt' || h === 'date' || h === 'дата' || h.startsWith('dt'));
  const dauIdx = headers.findIndex((h) => h === 'dau' || h.includes('dau') || h.includes('пользователи'));
  const queriesIdx = headers.findIndex((h) => h === 'ai_queries' || h === 'ai queries' || h.includes('queries') || h.includes('запрос'));
  const sessionsIdx = headers.findIndex((h) => h === 'sessions' || h.includes('session') || h.includes('сесси'));
  const qpuIdx = headers.findIndex((h) => h === 'queries_per_user' || h === 'queries per user' || h.includes('queries/user'));
  const spuIdx = headers.findIndex((h) => h === 'sessions_per_user' || h === 'sessions per user' || h.includes('sessions/user'));
  const qpsIdx = headers.findIndex((h) => h === 'queries_per_session' || h === 'queries per session' || h.includes('queries/session'));

  const points: DailyDataPoint[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawDate = dateIdx !== -1 ? row[dateIdx] : row[0];
    const dateStr = parseDate(rawDate);
    if (!dateStr || dateStr.length < 7) continue;

    const dau = dauIdx !== -1 ? parseNumber(row[dauIdx]) : parseNumber(row[1]);
    const queries = queriesIdx !== -1 ? parseNumber(row[queriesIdx]) : parseNumber(row[2]);
    const sessions = sessionsIdx !== -1 ? parseNumber(row[sessionsIdx]) : parseNumber(row[3]);

    const qpu = qpuIdx !== -1 && row[qpuIdx] !== undefined 
      ? parseNumber(row[qpuIdx]) 
      : (dau > 0 ? Number((queries / dau).toFixed(2)) : 0);

    const spu = spuIdx !== -1 && row[spuIdx] !== undefined 
      ? parseNumber(row[spuIdx]) 
      : (dau > 0 ? Number((sessions / dau).toFixed(2)) : 0);

    const qps = qpsIdx !== -1 && row[qpsIdx] !== undefined 
      ? parseNumber(row[qpsIdx]) 
      : (sessions > 0 ? Number((queries / sessions).toFixed(2)) : 0);

    points.push({
      date: dateStr,
      dau,
      queries,
      sessions,
      queriesPerUser: qpu,
      sessionsPerUser: spu,
      queriesPerSession: qps,
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parses raw matrix of values from 'Monthly data' sheet tab (fallback)
 */
export function parseMonthlySheet(rows: any[][]): MonthlyDataPoint[] {
  if (!rows || rows.length < 2) return [];

  const { headerIndex, headers } = findHeaderRowIndex(rows, [
    'month', 'месяц', 'mau', 'queries'
  ]);
  
  const findIdx = (keywords: string[]) => 
    headers.findIndex((h) => keywords.some((kw) => h.includes(kw.toLowerCase())));

  const monthIdx = findIdx(['month', 'месяц', 'period', 'период']);
  const mauIdx = findIdx(['mau', 'мау', 'monthly active']);
  const avgDauIdx = findIdx(['avg dau', 'dau (avg)', 'среднее dau']);
  const queriesIdx = findIdx(['total queries', 'queries', 'запросы']);
  const sessionsIdx = findIdx(['total sessions', 'sessions', 'сессии']);
  const stickIdx = findIdx(['stickiness', 'stick']);
  const qpuIdx = findIdx(['queries per user', 'queries/user']);
  const spuIdx = findIdx(['sessions per user', 'sessions/user']);
  const qpsIdx = findIdx(['queries per session', 'queries/session']);

  const points: MonthlyDataPoint[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawMonth = monthIdx !== -1 ? String(row[monthIdx]).trim() : String(row[0]).trim();
    if (!rawMonth || rawMonth.length < 3) continue;

    const mau = mauIdx !== -1 ? parseNumber(row[mauIdx]) : parseNumber(row[1]);
    const avgDau = avgDauIdx !== -1 ? parseNumber(row[avgDauIdx]) : parseNumber(row[2]);
    const totalQueries = queriesIdx !== -1 ? parseNumber(row[queriesIdx]) : parseNumber(row[3]);
    const totalSessions = sessionsIdx !== -1 ? parseNumber(row[sessionsIdx]) : parseNumber(row[4]);

    let stickiness = stickIdx !== -1 && row[stickIdx] !== undefined 
      ? parseNumber(row[stickIdx]) 
      : (mau > 0 ? Number(((avgDau / mau) * 100).toFixed(2)) : 0);

    if (stickiness > 0 && stickiness < 1) {
      stickiness = Number((stickiness * 100).toFixed(2));
    }

    const qpu = qpuIdx !== -1 && row[qpuIdx] !== undefined 
      ? parseNumber(row[qpuIdx]) 
      : (mau > 0 ? Number((totalQueries / mau).toFixed(2)) : 0);

    const spu = spuIdx !== -1 && row[spuIdx] !== undefined 
      ? parseNumber(row[spuIdx]) 
      : (mau > 0 ? Number((totalSessions / mau).toFixed(2)) : 0);

    const qps = qpsIdx !== -1 && row[qpsIdx] !== undefined 
      ? parseNumber(row[qpsIdx]) 
      : (totalSessions > 0 ? Number((totalQueries / totalSessions).toFixed(2)) : 0);

    const { key: mKey } = parseMonth(rawMonth);

    points.push({
      month: rawMonth,
      monthKey: mKey,
      mau,
      avgDau,
      totalQueries,
      totalSessions,
      stickiness,
      queriesPerUser: qpu,
      sessionsPerUser: spu,
      queriesPerSession: qps,
    });
  }

  return points;
}

/**
 * Parses raw matrix of values from 'Retention' sheet tab
 */
export function parseRetentionSheet(rows: any[][]): RetentionPoint[] {
  if (!rows || rows.length < 1) return [];

  const defaultWindows: Array<'1d' | '3d' | '7d' | '14d' | '30d'> = ['1d', '3d', '7d', '14d', '30d'];
  const resultsMap: Map<string, number> = new Map();

  // Search all rows and columns for window labels e.g. "1d", "3d", "7d", "14d", "30d"
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '')
        .replace(/canonical input sheet[^\n]*\./gi, '')
        .trim()
        .toLowerCase();
      
      const matchWin = defaultWindows.find(
        (w) =>
          cellVal === w ||
          cellVal === `${w} retention` ||
          cellVal === `retention_${w}` ||
          cellVal === `retention ${w}` ||
          cellVal === `retained_${w}`
      );

      if (matchWin && !resultsMap.has(matchWin)) {
        // 1. Check adjacent cell in same row (right column)
        if (row[c + 1] !== undefined) {
          const valRight = parseNumber(row[c + 1]);
          if (valRight > 0) {
            resultsMap.set(matchWin, valRight);
            continue;
          }
        }
        // 2. Check cell directly below in next row (same column)
        if (r + 1 < rows.length && rows[r + 1] && rows[r + 1][c] !== undefined) {
          const valBelow = parseNumber(rows[r + 1][c]);
          if (valBelow > 0) {
            resultsMap.set(matchWin, valBelow);
          }
        }
      }
    }
  }

  const results: RetentionPoint[] = defaultWindows
    .filter((w) => resultsMap.has(w))
    .map((w) => ({
      window: w,
      label: w,
      value: resultsMap.get(w)!,
    }));

  if (results.length === 0) {
    return [];
  }

  return results;
}

export function parseCsvString(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/);
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);
    rows.push(row);
  }
  return rows;
}

/**
 * Direct client-side Google Sheets fetching via GViz CSV endpoint (used on GitHub Pages & static environments)
 */
export async function fetchDirectFromGviz(spreadsheetId: string): Promise<Record<string, string[][]>> {
  const REQUIRED_SHEETS = ['Calc_Data', 'Dashboard_Helper', 'Daily data', 'Monthly data', 'Retention'];
  const SHEET_ALIASES: Record<string, string[]> = {
    Calc_Data: ['Calc_Data', 'calc_data', 'CalcData', 'Calc Data', 'calc'],
    Dashboard_Helper: ['Dashboard_Helper', 'dashboard_helper', 'DashboardHelper', 'Dashboard Helper', 'Dashboard'],
    'Daily data': ['Daily data', 'Daily Data', 'daily_data', 'DailyData', 'daily'],
    'Monthly data': ['Monthly data', 'Monthly Data', 'monthly_data', 'MonthlyData', 'monthly'],
    Retention: ['Retention', 'retention', 'Retention Data', 'RetentionData'],
  };

  const dataMap: Record<string, string[][]> = {};
  await Promise.all(
    REQUIRED_SHEETS.map(async (sheet) => {
      const aliases = SHEET_ALIASES[sheet] || [sheet];
      for (const alias of aliases) {
        try {
          const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(alias)}`;
          const res = await fetch(url);
          if (res.ok) {
            const text = await res.text();
            if (
              text &&
              !text.includes('<!DOCTYPE html>') &&
              !text.includes('<html') &&
              !text.includes('google-signin')
            ) {
              const rows = parseCsvString(text);
              if (rows.length > 0) {
                dataMap[sheet] = rows;
                dataMap[alias] = rows;
                break;
              }
            }
          }
        } catch {
          // ignore and try next alias
        }
      }
    })
  );

  return dataMap;
}

/**
 * Fetches dataset from Google Sheet via our server proxy or direct client-side fallback
 */
export async function fetchGoogleSheetData(
  spreadsheetId: string,
  accessToken?: string | null
): Promise<ProcessedDataset> {
  if (!spreadsheetId) {
    throw new Error(
      'К данному дашборду пока не привязана Google Таблица. Администратор должен указать ссылку на источник в Admin-панели.'
    );
  }

  let dataMap: Record<string, any[][]> | null = null;
  let title = 'Google Sheet Analytics';
  let availableSheets: string[] = [];

  // 1. Try server proxy if available
  try {
    const url = `/api/sheets/fetch?spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, { headers });
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        dataMap = json.data as Record<string, any[][]>;
        title = json.title || title;
        availableSheets = json.sheetNames || Object.keys(dataMap);
      }
    }
  } catch {
    // Backend API unavailable (e.g. running on static hosting like GitHub Pages)
  }

  // 2. Direct client-side GViz fetch fallback (works on GitHub Pages for public sheets)
  if (!dataMap || Object.keys(dataMap).length === 0) {
    try {
      const directMap = await fetchDirectFromGviz(spreadsheetId);
      if (Object.keys(directMap).length > 0) {
        dataMap = directMap;
        availableSheets = Object.keys(directMap);
      }
    } catch (err: any) {
      console.warn('Direct GViz fetch error:', err);
    }
  }

  if (!dataMap || Object.keys(dataMap).length === 0) {
    throw new Error(
      `Не удалось загрузить данные из Google Таблицы (ID: ${spreadsheetId}). Убедитесь, что таблица доступна для чтения («Все, у кого есть ссылка»).`
    );
  }

  let rawDashboardHelper: any[][] | null = null;
  let rawCalcData: any[][] | null = null;
  let rawDaily: any[][] | null = null;
  let rawMonthly: any[][] | null = null;
  let rawRetention: any[][] | null = null;

  const keys = Object.keys(dataMap);

  const findSheetRows = (patterns: string[]): any[][] | null => {
    // 1. First attempt: exact normalized match
    for (const pat of patterns) {
      const normPat = pat.toLowerCase().replace(/[\s_]/g, '');
      const match = keys.find((k) => k.toLowerCase().replace(/[\s_]/g, '') === normPat);
      if (match && dataMap![match] && dataMap![match].length > 0) {
        return dataMap![match];
      }
    }
    // 2. Second attempt: substring match
    for (const pat of patterns) {
      const normPat = pat.toLowerCase().replace(/[\s_]/g, '');
      const match = keys.find((k) => k.toLowerCase().replace(/[\s_]/g, '').includes(normPat));
      if (match && dataMap![match] && dataMap![match].length > 0) {
        return dataMap![match];
      }
    }
    return null;
  };

    rawDashboardHelper = findSheetRows(['dashboard_helper', 'dashboardhelper', 'dashboard helper', 'helper', 'dashboard']);
    rawCalcData = findSheetRows(['calc_data', 'calcdata', 'calc data', 'calc']);
    rawDaily = findSheetRows(['daily_data', 'dailydata', 'daily data', 'daily']);
    rawMonthly = findSheetRows(['monthly_data', 'monthlydata', 'monthly data', 'monthly']);
    rawRetention = findSheetRows(['retention']);

  // 1. Calc_Data Parsing (Canonical Source of Truth for KPI Cards)
  let calcData: CalcDataPoint[] = rawCalcData ? parseCalcDataSheet(rawCalcData) : [];
  
  // Fallback for calcData if Calc_Data sheet is absent
  if (calcData.length === 0 && rawMonthly) {
    const legacyMonthly = parseMonthlySheet(rawMonthly);
    calcData = legacyMonthly.map((m) => ({
      month: m.month,
      monthKey: m.monthKey || parseMonth(m.month).key,
      avgDau: m.avgDau,
      mau: m.mau,
      totalQueries: m.totalQueries,
      stickiness: m.stickiness,
      queriesPerUser: m.queriesPerUser,
      sessionsPerUser: m.sessionsPerUser,
      queriesPerSession: m.queriesPerSession,
    }));
  }

  // 2. Dashboard_Helper Parsing (Primary Source for ALL CHARTS)
  const helperResult: DashboardHelperResult = rawDashboardHelper
    ? parseDashboardHelperSheet(rawDashboardHelper)
    : { dailyData: [], monthlyChartData: [], retentionData: [] };

  let dailyData = helperResult.dailyData;
  if (dailyData.length === 0 && rawDaily) {
    dailyData = parseDailySheet(rawDaily);
  }

  let monthlyChartData = helperResult.monthlyChartData;
  if (monthlyChartData.length === 0) {
    // Derive monthly chart points directly from Calc_Data if no Dashboard_Helper monthly section
    monthlyChartData = calcData.map((c) => ({
      month: c.month,
      monthKey: c.monthKey,
      mau: c.mau,
      stickiness: c.stickiness,
    }));
  }

  // Synthesize calcData if absent using dailyData + monthlyChartData
  if (calcData.length === 0 && monthlyChartData.length > 0) {
    calcData = monthlyChartData.map((m) => {
      const monthDailies = dailyData.filter((d) => d.date.startsWith(m.monthKey));
      const dayCount = monthDailies.length || 1;
      const sumDau = monthDailies.reduce((acc, curr) => acc + curr.dau, 0);
      const sumQueries = monthDailies.reduce((acc, curr) => acc + curr.queries, 0);
      const sumSessions = monthDailies.reduce((acc, curr) => acc + (curr.sessions || 0), 0);
      
      const avgDau = Math.round(sumDau / dayCount);
      const avgQpu = monthDailies.reduce((acc, curr) => acc + curr.queriesPerUser, 0) / dayCount;
      const avgSpu = monthDailies.reduce((acc, curr) => acc + curr.sessionsPerUser, 0) / dayCount;
      const avgQps = monthDailies.reduce((acc, curr) => acc + curr.queriesPerSession, 0) / dayCount;

      const qpu = m.mau > 0 && sumQueries > 0 ? Number((sumQueries / m.mau).toFixed(2)) : Number((avgQpu || 3.3).toFixed(2));
      const spu = m.mau > 0 && sumSessions > 0 ? Number((sumSessions / m.mau).toFixed(2)) : Number((avgSpu || 1.06).toFixed(2));
      const qps = sumSessions > 0 && sumQueries > 0 ? Number((sumQueries / sumSessions).toFixed(2)) : Number((avgQps || 3.2).toFixed(2));

      return {
        month: m.month,
        monthKey: m.monthKey,
        avgDau: avgDau || Math.round(m.mau * (m.stickiness / 100)),
        mau: m.mau,
        totalQueries: sumQueries || Math.round(m.mau * qpu),
        stickiness: m.stickiness,
        queriesPerUser: qpu,
        sessionsPerUser: spu,
        queriesPerSession: qps,
      };
    });
  }

  let retentionData = helperResult.retentionData;
  if (retentionData.length === 0 && rawRetention) {
    retentionData = parseRetentionSheet(rawRetention);
  }

  const legacyMonthly: MonthlyDataPoint[] = calcData.map((c) => ({
    month: c.month,
    monthKey: c.monthKey,
    mau: c.mau,
    avgDau: c.avgDau,
    totalQueries: c.totalQueries,
    totalSessions: Math.round(c.totalQueries / (c.queriesPerSession || 1)),
    stickiness: c.stickiness,
    queriesPerUser: c.queriesPerUser,
    sessionsPerUser: c.sessionsPerUser,
    queriesPerSession: c.queriesPerSession,
  }));

  if (calcData.length === 0 && dailyData.length === 0) {
    throw new Error(
      `Ошибка подключения: В подсоединённой Google Таблице (ID: ${spreadsheetId}) не найдены обязательные аналитические вкладки (Calc_Data, Dashboard_Helper, Daily data, Monthly data) или структура колонок. Пожалуйста, убедитесь, что вы подключаете правильную Google Таблицу AI Search Analytics.`
    );
  }

  return {
    dailyData,
    monthlyChartData,
    calcData,
    monthlyData: legacyMonthly,
    retentionData,
    source: {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      isCustom: true,
      title: title || 'Google Sheet Analytics',
      lastFetched: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      availableSheets: availableSheets || [],
    },
  };
}
