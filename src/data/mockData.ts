// Legacy mock data removed per architecture specification.
// All datasets are fetched directly from Google Sheets via Admin configured dashboard sources.

export const EMPTY_DATASET = {
  dailyData: [],
  monthlyChartData: [],
  calcData: [],
  monthlyData: [],
  retentionData: [],
  source: {
    spreadsheetId: '',
    spreadsheetUrl: '',
    isCustom: false,
    title: 'Источник не подключён',
    availableSheets: [],
  },
};
