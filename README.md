# Product Analytics Dashboard

Интерактивный аналитический дашборд продукта (AI Search Analytics) с прямой интеграцией данных из Google Sheets.

## Автоматический деплой на GitHub Pages

Репозиторий уже полностью настроен для автоматической сборки и публикации при каждом push в ветку `main` (или `master`).

### Как опубликовать проект:

1. **Создайте репозиторий на GitHub** с именем `product-analytics-dashboard`.
2. **Загрузите файлы** из скачанного ZIP-архива в ваш репозиторий:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<ваш-username>/product-analytics-dashboard.git
   git push -u origin main
   ```
3. **Включите GitHub Actions для GitHub Pages**:
   - Откройте ваш репозиторий на GitHub.
   - Перейдите в **Settings** → **Pages** (в боковом меню).
   - В секции **Build and deployment** выберите:
     - **Source**: `GitHub Actions`
4. GitHub Actions автоматически запустит воркфлоу `.github/workflows/deploy.yml` и развернет дашборд по адресу:
   ```
   https://<ваш-username>.github.io/product-analytics-dashboard/
   ```

---

## Архитектура и автономность (Zero Backend Dependencies)

- **Прямой сбор данных (Direct GViz Fallback)**: При развертывании на GitHub Pages дашборд обращается напрямую к Google Sheets через безопасный GViz CSV API, не требуя выделенного бэкенда.
- **Хранение конфигураций**: Список дашбордов и настройки синхронизируются локально в браузере.
- **Хэш-роутинг**: Поддержка перехода в панель администратора через `/#/admin` без ошибок 404.
