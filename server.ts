import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface DashboardConfig {
  id: string;
  name: string;
  spreadsheetId: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DASHBOARDS_FILE = path.join(DATA_DIR, 'dashboards.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDashboards(): DashboardConfig[] {
  ensureDataDir();
  if (!fs.existsSync(DASHBOARDS_FILE)) {
    const initial: DashboardConfig[] = [
      {
        id: 'ai-search',
        name: 'AI Search',
        spreadsheetId: '1xqb53jMewcKORMcKgyy2qqcyAUpsLBElVbN7Nzz2VUA',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(DASHBOARDS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const content = fs.readFileSync(DASHBOARDS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Failed to read dashboards.json:', err);
    return [];
  }
}

function saveDashboards(dashboards: DashboardConfig[]) {
  ensureDataDir();
  fs.writeFileSync(DASHBOARDS_FILE, JSON.stringify(dashboards, null, 2), 'utf-8');
}

function extractSpreadsheetId(input: string): string | null {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  if (/^[a-zA-Z0-9-_]{20,80}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function parseCsvString(csvText: string): string[][] {
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- ADMIN AUTH ENDPOINTS & SECRETS MANAGEMENT ---
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  // Active admin session tokens stored purely server-side
  const activeAdminTokens = new Set<string>();

  const requireAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Необходима авторизация администратора' });
    }
    const token = authHeader.substring(7).trim();
    if (!token || !activeAdminTokens.has(token)) {
      return res.status(401).json({ success: false, message: 'Сессия истекла или недействительна. Войдите снова.' });
    }
    next();
  };

  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Укажите логин и пароль',
      });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password);

    if (cleanUsername === ADMIN_USERNAME && cleanPassword === ADMIN_PASSWORD) {
      const token = `admin_sec_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      activeAdminTokens.add(token);

      return res.json({
        success: true,
        token,
        message: 'Авторизация прошла успешно',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Неверный логин или пароль администратора',
    });
  });

  // --- DASHBOARD CONFIGURATION ENDPOINTS ---
  app.get('/api/dashboards', (req, res) => {
    const dashboards = loadDashboards();
    const showAll = req.query.all === 'true';
    if (showAll) {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
      if (token && activeAdminTokens.has(token)) {
        return res.json({ success: true, dashboards });
      }
    }
    const active = dashboards.filter((d) => d.status === 'active');
    return res.json({ success: true, dashboards: active });
  });

  app.post('/api/admin/dashboards', requireAdminAuth, (req, res) => {
    const { id, name, spreadsheetId, spreadsheetUrl, status } = req.body;

    if (!id || !name) {
      return res.status(400).json({ success: false, message: 'ID и Название обязательны' });
    }

    const cleanId = String(id).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const cleanSpreadsheetId = extractSpreadsheetId(spreadsheetId || spreadsheetUrl || '') || (spreadsheetId ? String(spreadsheetId).trim() : '');

    const dashboards = loadDashboards();
    const existingIdx = dashboards.findIndex((d) => d.id === cleanId);

    const now = new Date().toISOString();
    if (existingIdx !== -1) {
      return res.status(400).json({ success: false, message: `Дашборд с ID "${cleanId}" уже существует.` });
    }

    const newDash: DashboardConfig = {
      id: cleanId,
      name: String(name).trim(),
      spreadsheetId: cleanSpreadsheetId,
      status: status === 'inactive' ? 'inactive' : 'active',
      createdAt: now,
      updatedAt: now,
    };

    dashboards.push(newDash);
    saveDashboards(dashboards);

    return res.json({ success: true, dashboard: newDash });
  });

  app.put('/api/admin/dashboards/:id', requireAdminAuth, (req, res) => {
    const dashId = req.params.id;
    const { name, spreadsheetId, spreadsheetUrl, status } = req.body;

    const dashboards = loadDashboards();
    const idx = dashboards.findIndex((d) => d.id === dashId);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: `Дашборд "${dashId}" не найден.` });
    }

    const cleanSpreadsheetId = extractSpreadsheetId(spreadsheetId || spreadsheetUrl || '') || (spreadsheetId !== undefined ? String(spreadsheetId).trim() : dashboards[idx].spreadsheetId);

    dashboards[idx] = {
      ...dashboards[idx],
      name: name ? String(name).trim() : dashboards[idx].name,
      spreadsheetId: cleanSpreadsheetId,
      status: status ? status : dashboards[idx].status,
      updatedAt: new Date().toISOString(),
    };

    saveDashboards(dashboards);
    return res.json({ success: true, dashboard: dashboards[idx] });
  });

  app.delete('/api/admin/dashboards/:id', requireAdminAuth, (req, res) => {
    const dashId = req.params.id;
    const dashboards = loadDashboards();
    const filtered = dashboards.filter((d) => d.id !== dashId);

    if (filtered.length === dashboards.length) {
      return res.status(404).json({ success: false, message: `Дашборд "${dashId}" не найден.` });
    }

    saveDashboards(filtered);
    return res.json({ success: true, message: `Дашборд "${dashId}" успешно удалён.` });
  });

  // --- DATA CONTRACT VALIDATOR ---
  app.post('/api/admin/dashboards/test', requireAdminAuth, async (req, res) => {
    const { spreadsheetId, spreadsheetUrl } = req.body;
    const targetId = extractSpreadsheetId(spreadsheetId || spreadsheetUrl || '');

    if (!targetId) {
      return res.status(400).json({
        valid: false,
        message: 'Spreadsheet ID некорректен или имеет неверный формат. Укажите валидную ссылку Google Sheet или её ID.',
      });
    }

    const REQUIRED_SHEETS = ['Calc_Data', 'Dashboard_Helper', 'Daily data', 'Monthly data', 'Retention'];
    const SHEET_NAME_ALIASES: Record<string, string[]> = {
      Calc_Data: ['Calc_Data', 'calc_data', 'CalcData', 'Calc Data', 'calc'],
      Dashboard_Helper: ['Dashboard_Helper', 'dashboard_helper', 'DashboardHelper', 'Dashboard Helper', 'Dashboard'],
      'Daily data': ['Daily data', 'Daily Data', 'daily_data', 'DailyData', 'daily'],
      'Monthly data': ['Monthly data', 'Monthly Data', 'monthly_data', 'MonthlyData', 'monthly'],
      Retention: ['Retention', 'retention', 'Retention Data', 'RetentionData'],
    };

    const gvizDataMap: Record<string, string[][]> = {};
    const foundSheets: string[] = [];
    const missingSheets: string[] = [];
    const missingHeaders: Record<string, string[]> = {};

    for (const canonicalSheet of REQUIRED_SHEETS) {
      let sheetFound = false;
      const aliases = SHEET_NAME_ALIASES[canonicalSheet] || [canonicalSheet];

      for (const alias of aliases) {
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${targetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(alias)}`;
          const gvizRes = await fetch(gvizUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });

          if (gvizRes.ok) {
            const text = await gvizRes.text();
            if (
              text &&
              !text.includes('<!DOCTYPE html>') &&
              !text.includes('<html') &&
              !text.includes('google-signin')
            ) {
              const rows = parseCsvString(text);
              if (rows.length >= 1) {
                gvizDataMap[canonicalSheet] = rows;
                foundSheets.push(canonicalSheet);
                sheetFound = true;
                break;
              }
            }
          }
        } catch {
          // try next alias
        }
      }

      if (!sheetFound) {
        missingSheets.push(canonicalSheet);
      }
    }

    if (foundSheets.length === 0) {
      return res.json({
        valid: false,
        message:
          'Google Sheet недоступна или имеет закрытый доступ. Убедитесь, что доступ открыт по ссылке («Все, у кого есть ссылка»).',
        missingSheets: REQUIRED_SHEETS,
      });
    }

    // Header requirements per sheet
    const HEADER_REQUIREMENTS: Record<string, string[]> = {
      'Daily data': ['dt', 'dau', 'sessions', 'ai_queries', 'queries_per_user'],
      Dashboard_Helper: [
        'Date',
        'DAU',
        'Sessions',
        'AI Queries',
        'Queries per User',
        'Sessions per User',
        'Queries per Session',
        'Month',
        'MAU',
        'Stickiness',
      ],
      Calc_Data: ['month', 'dau', 'mau', 'queries'],
      'Monthly data': ['month', 'mau'],
      Retention: ['Window', 'Retention'],
    };

    const HEADER_ALIASES: Record<string, string[]> = {
      dt: ['dt', 'date', 'дата', 'day', 'dt_col', 'date/time', 'date_time', 'time', 'timestamp'],
      date: ['date', 'dt', 'дата', 'day', 'date/time', 'date_time', 'time', 'timestamp'],
      dau: ['dau', 'avg dau', 'active users', 'пользователи', 'dau_val', 'daily active users'],
      sessions: ['sessions', 'total sessions', 'сессии', 'session', 'сессий'],
      ai_queries: ['ai_queries', 'ai queries', 'queries', 'total ai queries', 'total queries', 'запросы', 'запрос', 'ai_query', 'total_queries'],
      queries: ['queries', 'ai_queries', 'ai queries', 'total ai queries', 'total queries', 'запросы', 'запрос', 'ai_query', 'total_queries'],
      'ai queries': ['ai queries', 'ai_queries', 'queries', 'total ai queries', 'total queries', 'запросы', 'запрос', 'ai_query', 'total_queries'],
      queries_per_user: ['queries_per_user', 'queries per user', 'queries/user', 'qpu', 'запросов на пользователя'],
      'queries per user': ['queries_per_user', 'queries per user', 'queries/user', 'qpu', 'запросов на пользователя'],
      sessions_per_user: ['sessions_per_user', 'sessions per user', 'sessions/user', 'spu', 'сессий на пользователя'],
      'sessions per user': ['sessions_per_user', 'sessions per user', 'sessions/user', 'spu', 'сессий на пользователя'],
      queries_per_session: ['queries_per_session', 'queries per session', 'queries/session', 'qps', 'запросов на сессию'],
      'queries per session': ['queries_per_session', 'queries per session', 'queries/session', 'qps', 'запросов на сессию'],
      month: ['month', 'месяц', 'period', 'период', 'mon', 'month_key'],
      mau: ['mau', 'мау', 'monthly active users'],
      stickiness: ['stickiness', 'sticky', 'dau/mau', 'стиккинес', 'липкость', 'stickiness_%', 'stickiness %'],
      window: ['window', 'окно', 'период', 'days', 'period', 'retention window', 'cohort', 'interval', '1d', '3d', '7d', '14d', '30d', 'window / period', 'дней', 'день', 'окно удержания'],
      retention: ['retention', 'удержание', 'retention_%', 'retention %', 'retention_rate', 'user retention'],
    };

    function matchesHeader(cellStr: string, requiredHeader: string): boolean {
      if (!cellStr || !requiredHeader) return false;

      const hClean = String(cellStr)
        .replace(/[\uFEFF\u200B\u00A0]/g, ' ')
        .trim()
        .toLowerCase();
      const reqClean = String(requiredHeader)
        .replace(/[\uFEFF\u200B\u00A0]/g, ' ')
        .trim()
        .toLowerCase();

      if (!hClean || !reqClean) return false;

      if (hClean === reqClean) return true;

      const hNorm = hClean.replace(/[_/\-]/g, ' ').replace(/\s+/g, ' ');
      const reqNorm = reqClean.replace(/[_/\-]/g, ' ').replace(/\s+/g, ' ');
      if (hNorm === reqNorm) return true;

      const aliases = HEADER_ALIASES[reqClean] || HEADER_ALIASES[reqNorm] || [];
      if (
        aliases.some((a) => {
          const aClean = a.toLowerCase().trim();
          const aNorm = aClean.replace(/[_/\-]/g, ' ').replace(/\s+/g, ' ');
          return hClean === aClean || hNorm === aNorm || hClean.includes(aClean) || aClean.includes(hClean);
        })
      ) {
        return true;
      }

      if (
        reqClean.length >= 2 &&
        (hClean.includes(reqClean) || reqClean.includes(hClean) || hNorm.includes(reqNorm) || reqNorm.includes(hNorm))
      ) {
        return true;
      }

      return false;
    }

    const sheetDiagnostics: Record<
      string,
      {
        rawTop5Rows: string[][];
        detectedHeaderRowNumber: number;
        rawHeaderRow: string[];
        parsedHeaders: string[];
        foundHeaders: string[];
        missingHeaders: string[];
      }
    > = {};

    for (const sheetName of foundSheets) {
      const rows = gvizDataMap[sheetName];
      if (!rows || rows.length === 0) {
        missingHeaders[sheetName] = ['Строки данных не найдены'];
        sheetDiagnostics[sheetName] = {
          rawTop5Rows: [],
          detectedHeaderRowNumber: 1,
          rawHeaderRow: [],
          parsedHeaders: [],
          foundHeaders: [],
          missingHeaders: HEADER_REQUIREMENTS[sheetName] || [],
        };
        continue;
      }

      const candidateRows = rows.slice(0, 20);
      const requiredList = HEADER_REQUIREMENTS[sheetName] || [];

      let bestRowIdx = 0;
      let maxMatchedCount = -1;
      let bestFoundHeaders: string[] = [];
      let bestMissingHeaders: string[] = requiredList;

      for (let rIdx = 0; rIdx < candidateRows.length; rIdx++) {
        const candidateRow = candidateRows[rIdx] || [];
        const found: string[] = [];
        const missing: string[] = [];

        for (const reqHeader of requiredList) {
          const isFound = candidateRow.some((cell) => matchesHeader(cell, reqHeader));
          if (isFound) {
            found.push(reqHeader);
          } else {
            missing.push(reqHeader);
          }
        }

        if (found.length > maxMatchedCount) {
          maxMatchedCount = found.length;
          bestRowIdx = rIdx;
          bestFoundHeaders = found;
          bestMissingHeaders = missing;
        }
      }

      const detectedHeaderRow = rows[bestRowIdx] || [];
      const parsedHeaders = detectedHeaderRow.map((c) => String(c || '').trim());

      sheetDiagnostics[sheetName] = {
        rawTop5Rows: candidateRows.slice(0, 5),
        detectedHeaderRowNumber: bestRowIdx + 1,
        rawHeaderRow: detectedHeaderRow,
        parsedHeaders,
        foundHeaders: bestFoundHeaders,
        missingHeaders: bestMissingHeaders,
      };

      // A sheet is considered valid if ALL required headers are found OR if a high proportion (>= 50% or key headers) are present
      if (bestMissingHeaders.length > 0 && bestFoundHeaders.length < Math.ceil(requiredList.length * 0.5)) {
        missingHeaders[sheetName] = bestMissingHeaders;
      }
    }

    const hasMissingSheets = missingSheets.length > 0;
    const hasMissingHeaders = Object.keys(missingHeaders).length > 0;

    if (!hasMissingSheets && !hasMissingHeaders) {
      return res.json({
        valid: true,
        message: '✓ Подключение успешно. Data Contract соответствует требованиям.',
        sheetNames: foundSheets,
        diagnostics: sheetDiagnostics,
      });
    }

    const errorParts: string[] = [];
    if (hasMissingSheets) {
      errorParts.push(`отсутствуют обязательные листы: ${missingSheets.join(', ')}`);
    }
    if (hasMissingHeaders) {
      const details = Object.entries(missingHeaders)
        .map(([s, h]) => `${s} (не найдены колонки: ${h.join(', ')})`)
        .join('; ');
      errorParts.push(`не найдены ожидаемые headers в листах: ${details}`);
    }

    return res.json({
      valid: false,
      message: `Ошибка валидации структуры Google Sheet: ${errorParts.join('; ')}.`,
      missingSheets,
      missingHeaders,
      diagnostics: sheetDiagnostics,
    });
  });

  let lastFetchLog: {
    spreadsheetId: string;
    sheetNames: string[];
    data: Record<string, any[][]>;
    mode: string;
    timestamp: string;
    error?: string;
  } | null = null;

  // Endpoint to inspect the raw data received during the last fetch
  app.get('/api/sheets/debug_last', (req, res) => {
    if (!lastFetchLog) {
      return res.json({ success: false, message: 'No fetch requests received yet.' });
    }
    res.json({ success: true, ...lastFetchLog });
  });

  // Proxy endpoint to fetch Google Sheet data securely
  app.get('/api/sheets/fetch', async (req, res) => {
    const spreadsheetId = req.query.spreadsheetId as string;
    const authHeader = req.headers.authorization;

    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'spreadsheetId parameter is required' });
    }

    console.log('[SHEETS_PROXY] Received fetch request for spreadsheetId:', spreadsheetId);

    const sheetsToTry = [
      'Dashboard_Helper',
      'Calc_Data',
      'Daily data',
      'Monthly data',
      'Retention',
      'Dashboard',
      'dashboard_helper',
      'calc_data',
      'Daily Data',
      'Monthly Data',
      'retention',
      'dashboard',
    ];

    const ANALYTICS_KEYWORDS = ['month', 'месяц', 'date', 'дата', 'dau', 'mau', 'queries', 'запрос', 'stickiness', 'retention', 'period', 'период', 'session'];

    // 1. If Auth Header is provided, attempt Google Sheets API v4 first
    if (authHeader) {
      try {
        // Fetch metadata to discover all actual sheet titles in the spreadsheet
        let actualSheetTitles = sheetsToTry;
        try {
          const metaRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
            { headers: { Authorization: authHeader } }
          );
          if (metaRes.ok) {
            const metaJson = await metaRes.json();
            if (metaJson.sheets && Array.isArray(metaJson.sheets)) {
              const titles = metaJson.sheets
                .map((s: any) => s.properties?.title)
                .filter(Boolean);
              if (titles.length > 0) {
                actualSheetTitles = Array.from(new Set([...titles, ...sheetsToTry]));
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch sheet metadata, using default sheets list:', e);
        }

        const rangesParam = actualSheetTitles
          .map((s) => `ranges=${encodeURIComponent(s)}!A1:Z1000`)
          .join('&');
        const googleApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParam}&valueRenderOption=UNFORMATTED_VALUE`;

        const response = await fetch(googleApiUrl, {
          headers: { Authorization: authHeader },
        });
        const json = await response.json();

        if (response.ok && json.valueRanges) {
          const sheetDataMap: Record<string, any[][]> = {};
          json.valueRanges.forEach((rangeObj: any) => {
            const rangeName = rangeObj.range || '';
            const sheetName = rangeName.split('!')[0].replace(/'/g, '');
            if (rangeObj.values && rangeObj.values.length > 0) {
              sheetDataMap[sheetName] = rangeObj.values;
            }
          });

          if (Object.keys(sheetDataMap).length > 0) {
            lastFetchLog = {
              spreadsheetId,
              sheetNames: Object.keys(sheetDataMap),
              data: sheetDataMap,
              mode: 'google_api_v4',
              timestamp: new Date().toISOString(),
            };
            return res.json({
              success: true,
              spreadsheetId,
              sheetNames: Object.keys(sheetDataMap),
              data: sheetDataMap,
              mode: 'google_api_v4',
            });
          }
        }
      } catch (e) {
        console.warn('Google API v4 fetch failed, falling back to public CSV fetch:', e);
      }
    }

    // 2. Try Public GViz CSV Export (Works for any sheet shared as "Anyone with link can view")
    try {
      const gvizDataMap: Record<string, string[][]> = {};

      for (const sheetName of sheetsToTry) {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
        const gvizRes = await fetch(gvizUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (gvizRes.ok) {
          const text = await gvizRes.text();
          // Verify it's clean CSV and not an HTML login page
          if (text && !text.includes('<!DOCTYPE html>') && !text.includes('<html') && !text.includes('google-signin')) {
            const parsedRows = parseCsvString(text);
            if (parsedRows.length >= 2) {
              const headerStr = parsedRows[0].join(' ').toLowerCase();
              const hasAnalyticsHeader = ANALYTICS_KEYWORDS.some((kw) => headerStr.includes(kw));
              if (hasAnalyticsHeader) {
                gvizDataMap[sheetName] = parsedRows;
              }
            }
          }
        }
      }

      if (Object.keys(gvizDataMap).length > 0) {
        lastFetchLog = {
          spreadsheetId,
          sheetNames: Object.keys(gvizDataMap),
          data: gvizDataMap,
          mode: 'public_csv',
          timestamp: new Date().toISOString(),
        };
        return res.json({
          success: true,
          spreadsheetId,
          sheetNames: Object.keys(gvizDataMap),
          data: gvizDataMap,
          mode: 'public_csv',
        });
      }
    } catch (e) {
      console.warn('Public GViz CSV fetch attempt failed:', e);
    }

    lastFetchLog = {
      spreadsheetId,
      sheetNames: [],
      data: {},
      mode: 'failed',
      timestamp: new Date().toISOString(),
      error: 'Access denied or sheet not found',
    };

    // 3. If both failed, return a user-friendly error explanation
    return res.status(403).json({
      success: false,
      message: authHeader
        ? 'Не удалось прочитать таблицу с помощью вашего аккаунта. Убедитесь, что аккаунт имеет доступ к этой Google Таблице.'
        : 'Не удалось загрузить таблицу по ссылке. Если таблица приватная, нажмите «Авторизоваться через Google» и выберите нужный аккаунт, либо откройте доступ «Все, у кого есть ссылка» в настройках Google Таблицы.',
    });
  });

  // Vite development or production middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
