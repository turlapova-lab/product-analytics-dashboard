import React, { useState, useEffect } from 'react';
import { DashboardConfig, ValidationResult } from '../types';
import {
  fetchDashboards,
  adminLogin,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  testDashboardConnection,
} from '../services/dashboardsService';
import {
  ShieldCheck,
  Lock,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  ArrowLeft,
  X,
  ExternalLink,
} from 'lucide-react';

interface AdminPanelProps {
  onBackToApp: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToApp }) => {
  // Auth state
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('admin_token'));
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Dashboards list state
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDash, setEditingDash] = useState<DashboardConfig | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formId, setFormId] = useState<string>('');
  const [formSpreadsheet, setFormSpreadsheet] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Connection Test state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<ValidationResult | null>(null);

  // Load all dashboards when authenticated
  const loadList = async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const data = await fetchDashboards(true);
      setDashboards(data);
    } catch (err: any) {
      setListError(err.message || 'Ошибка загрузки дашбордов');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadList();
    }
  }, [token]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      const res = await adminLogin(username, password);
      if (res.success && res.token) {
        setToken(res.token);
        sessionStorage.setItem('admin_token', res.token);
      } else {
        setAuthError(res.message || 'Неверный логин или пароль');
      }
    } catch (err: any) {
      setAuthError('Ошибка подключения к серверу авторизации');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem('admin_token');
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingDash(null);
    setFormName('');
    setFormId('');
    setFormSpreadsheet('');
    setFormStatus('active');
    setFormError(null);
    setTestResult(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (dash: DashboardConfig) => {
    setEditingDash(dash);
    setFormName(dash.name);
    setFormId(dash.id);
    setFormSpreadsheet(dash.spreadsheetId);
    setFormStatus(dash.status);
    setFormError(null);
    setTestResult(null);
    setIsModalOpen(true);
  };

  // Handle Connection Test
  const handleTestConnection = async () => {
    if (!formSpreadsheet.trim()) {
      setTestResult({
        valid: false,
        message: 'Пожалуйста, введите Google Sheet URL или Spreadsheet ID.',
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testDashboardConnection(formSpreadsheet);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        valid: false,
        message: err.message || 'Не удалось выполнить проверку Google Sheet.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Handle Save Dashboard (Create or Update)
  const handleSaveDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formId.trim()) {
      setFormError('Название и ID дашборда обязательны.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingDash) {
        await updateDashboard(editingDash.id, {
          name: formName,
          spreadsheetId: formSpreadsheet,
          status: formStatus,
        });
      } else {
        await createDashboard({
          id: formId,
          name: formName,
          spreadsheetId: formSpreadsheet,
          status: formStatus,
        });
      }
      setIsModalOpen(false);
      await loadList();
    } catch (err: any) {
      setFormError(err.message || 'Ошибка сохранения дашборда');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Dashboard
  const handleDeleteDashboard = async (dash: DashboardConfig) => {
    if (!window.confirm(`Вы уверены, что хотите удалить дашборд "${dash.name}" (${dash.id})?`)) {
      return;
    }
    try {
      await deleteDashboard(dash.id);
      await loadList();
    } catch (err: any) {
      alert(`Ошибка удаления: ${err.message}`);
    }
  };

  // --- LOGIN SCREEN ---
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
            <p className="text-xs text-slate-500">Управление дашбордами и источниками Google Sheets</p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Логин администратора
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите логин..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Пароль администратора
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
              <span>Войти в систему</span>
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-100">
            <button
              onClick={onBackToApp}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Вернуться на сайт</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN MAIN DASHBOARDS MANAGEMENT VIEW ---
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900">
      {/* Top Header */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Admin-панель дашбордов</h1>
              <p className="text-xs text-slate-400">Управление конфигурациями и привязкой Google Sheets</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToApp}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>На сайт</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-800/50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Список дашбордов</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Каждый дашборд привязан к конкретной Google Sheet и использует единый data contract
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadList}
              disabled={isLoadingList}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Обновить</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить dashboard</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {listError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{listError}</span>
          </div>
        )}

        {/* Dashboards Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Name & ID</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Data Source (Spreadsheet ID)</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboards.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Дашборды пока не созданы. Нажмите «Добавить dashboard», чтобы создать первый.
                    </td>
                  </tr>
                ) : (
                  dashboards.map((dash) => (
                    <tr key={dash.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-sm">{dash.name}</div>
                        <div className="text-slate-400 text-[11px] font-mono mt-0.5">id: {dash.id}</div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                            dash.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              dash.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {dash.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-[11px] text-slate-600">
                        {dash.spreadsheetId ? (
                          <div className="flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[220px]">{dash.spreadsheetId}</span>
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${dash.spreadsheetId}/edit`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-700"
                              title="Открыть Google Sheet"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-sans text-[11px] font-medium">
                            Не привязана
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-500 text-[11px]">
                        {dash.updatedAt ? new Date(dash.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>

                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(dash)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDashboard(dash)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border border-rose-200/60"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- MODAL FOR CREATE / EDIT DASHBOARD --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingDash ? `Редактирование "${editingDash.name}"` : 'Новый Dashboard'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Настройте параметры дашборда и привязанную Google Sheet
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDashboard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dashboard Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!editingDash && !formId) {
                      setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
                    }
                  }}
                  placeholder="например: AI Search"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dashboard ID (slug) *
                </label>
                <input
                  type="text"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                  placeholder="например: ai-search"
                  disabled={!!editingDash}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Sheet URL или Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={formSpreadsheet}
                  onChange={(e) => setFormSpreadsheet(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1.../edit или 1d_..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="active">Active (видимый на сайте)</option>
                  <option value="inactive">Inactive (скрыт)</option>
                </select>
              </div>

              {/* TEST CONNECTION BUTTON & RESULT */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-300 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>Проверить подключение</span>
                </button>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-medium space-y-1 ${
                      testResult.valid
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {testResult.valid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>

                    {testResult.sheetNames && testResult.sheetNames.length > 0 && (
                      <div className="text-[11px] text-slate-600">
                        Найденные листы: {testResult.sheetNames.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />}
                  <span>Сохранить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
