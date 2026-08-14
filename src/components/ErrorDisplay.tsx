import React from 'react';
import { AlertTriangle, RefreshCw, Lock, FileQuestion, ArrowLeft } from 'lucide-react';

interface ErrorDisplayProps {
  dashboardName: string;
  errorMessage: string;
  onRetry: () => void;
  onOpenAdmin?: () => void;
  isRetrying?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  dashboardName,
  errorMessage,
  onRetry,
  onOpenAdmin,
  isRetrying,
}) => {
  return (
    <div className="max-w-4xl mx-auto my-12 px-4">
      <div className="bg-white rounded-2xl border border-rose-200/80 shadow-lg overflow-hidden">
        {/* Top Banner */}
        <div className="bg-rose-500/10 border-b border-rose-200/60 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Не удалось загрузить данные dashboard
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                Ошибка подключения
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Дашборд: <strong className="text-slate-900">{dashboardName}</strong>
            </p>
          </div>
        </div>

        {/* Diagnostic Details Body */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
            <div className="font-semibold text-rose-700 mb-1 flex items-center gap-1.5 font-sans text-xs">
              <FileQuestion className="w-4 h-4" />
              Диагностика ошибки:
            </div>
            {errorMessage || 'Неизвестная ошибка загрузки данных из Google Таблицы.'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Возможные причины:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>К дашборду ещё не привязана Google Sheet</li>
                <li>Настройки доступа таблицы закрыты для чтения</li>
                <li>Отсутствуют листы Calc_Data или Dashboard_Helper</li>
              </ul>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="font-bold text-slate-800">Действия для администратора:</div>
              <p className="text-slate-600">
                Перейдите в Admin-панель для настройки Google Sheet URL и выполнения проверки соответствия data contract.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>Повторить загрузку</span>
            </button>

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <span>Перейти в Admin-панель</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
