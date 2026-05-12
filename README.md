# eTMF — Электронный Trial Master File для клинических исследований

![eTMF Preview](public/preview.png)

## О проекте

**eTMF** — это комплексная веб-система управления документами для клинических исследований (Trial Master File). Система решает полный спектр задач по организации, контролю качества, версионированию и аудиту документов исследований.

### Ключевые возможности

- **Иерархическое управление документами**
  - Трёхуровневая структура: `GENERAL` (общие) → `COUNTRY` (по странам) → `SITE` (по центрам)
  - Структурированная организация папок и подпапок
  - Поддержка множественных исследований, центров, пользователей

- **Жизненный цикл документа**
  - Статусы: Draft → In Review → Approved → Archived
  - Управление документом от создания до архивирования
  - Возможность восстановления архивированных документов

- **Версионирование и история**
  - Полное сохранение версий всех документов
  - Возможность откатываться на предыдущие версии
  - История изменений с метаданными пользователя и времени

- **Рецензирование и рабочий процесс**
  - Система отправки документов на ревью
  - Комментарии и уведомления рецензентов
  - Дашборд для просмотра документов на ревью
  - Уведомления о новых документах

- **Ролевой доступ и безопасность**
  - Роли пользователей (admin, monitor, investigator и др.)
  - Гранулярные права доступа к документам
  - Проверка прав на все операции
  - Rate limiting и защита от атак (CSRF, CORS, Helmet)

- **Аудит и compliance**
  - Полный логирование всех действий пользователей
  - Метаданные запросов (IP, User-Agent, timestamp)
  - Отслеживание изменений документов
  - История доступов к документам

- **Масштабируемость и надежность**
  - Резервное копирование PostgreSQL + S3
  - Автоматический backup/restore скрипты
  - Интеграция с S3-совместимым хранилищем (YC Object Storage)
  - Email-уведомления через Resend

- **Экспорт и интеграция**
  - Экспорт документов в PDF
  - Скачивание всех документов исследования архивом
  - API для интеграции с внешними системами
  - Поддержка многоязычного интерфейса (i18n)

## Технологический стек

### Frontend
- **Next.js** `16.2.3` — React framework с App Router
- **React** `19.2.3` — UI библиотека
- **TypeScript** `^5` — Типизация
- **Radix UI** — Компоненты интерфейса
- **React Query** `^5` — Управление состоянием и кешированием запросов
- **react-intl** / **next-intl** — Многоязычность

### Backend & Инфраструктура
- **Next.js API Routes** — Backend endpoints
- **PostgreSQL** — Релационная база данных (`pg` driver)
- **AWS SDK v3** — Интеграция с Object Storage (S3-compatible)
- **JWT** — Аутентификация (`jsonwebtoken`)
- **Express Rate-Limit** — Ограничение частоты запросов
- **Helmet** — Безопасность HTTP headers
- **Joi** — Валидация данных

### UI & Стили
- **Radix UI Themes** — Система компонентов с темизацией
- **CSS Modules** — Локальные стили
- **React Icons** — Набор икон

### PDF & Документы
- **@react-pdf-viewer** — Просмотр PDF в браузере
- **@react-pdf/renderer** — Генерация PDF
- **pdfjs-dist** — PDF.js для работы с PDF
- **react-file-icon** — Иконки файлов

### Email & Уведомления
- **Resend** — Email сервис
- **@react-email** — Компоненты email-шаблонов

### Версионирование & Хранилище
- **Archiver** — Создание архивов
- **File-saver** — Скачивание файлов в браузер
- **UUID** — Генерация уникальных идентификаторов
- **Bcrypt/Bcryptjs** — Хеширование паролей

### DevOps
- **Docker** — Контейнеризация
- **Jest** — Тестирование
- **Husky** — Git hooks
- **ESLint** — Линтинг

## Архитектура проекта

```
src/
├── app/                      # Next.js App Router (страницы и API)
│   ├── api/                  # Backend endpoints
│   │   ├── admin/            # Админ API (пользователи, исследования, центры)
│   │   ├── auth/             # Аутентификация и авторизация
│   │   ├── documents/        # Управление документами
│   │   ├── audit/            # Логирование действий
│   │   ├── reports/          # Отчеты и дашборды
│   │   ├── studies/          # Управление исследованиями
│   │   ├── site/             # Управление центрами
│   │   ├── metrics/          # Метрики системы
│   │   └── users/            # Управление пользователями
│   ├── login/                # Страница входа
│   ├── home/                 # Главная страница
│   ├── admin/                # Админ-панель
│   ├── reports/              # Отчеты
│   ├── reviews/              # Страница рецензирования
│   ├── reset-password/       # Сброс пароля
│   └── layout.tsx            # Основной layout
│
├── components/               # React компоненты
│   ├── ui/                   # Базовые UI компоненты
│   ├── admin/                # Компоненты админ-панели
│   ├── panels/               # Панели приложения
│   ├── reports/              # Компоненты отчетов
│   ├── FolderExplorer/       # Навигация по документам
│   ├── DocumentActions.tsx   # Действия с документами
│   ├── DocumentStatusBadge.tsx
│   ├── PDFViewer.tsx         # Просмотр PDF
│   ├── Modal.tsx             # Модальные окна
│   └── ...                   # Другие компоненты
│
├── domain/                   # Доменная логика (business rules)
│   ├── document/
│   │   ├── document.logic.ts
│   │   ├── document.policy.ts      # Политики доступа
│   │   └── document.transitions.ts # Переходы состояний
│   └── reports/
│
├── lib/                      # Утилиты и сервисы
│   ├── db/                   # Database queries и операции
│   ├── auth/                 # Аутентификация и JWT
│   ├── audit/                # Логирование действий
│   ├── security/             # Валидация, CSRF, CORS
│   ├── cloud/                # S3 / Object Storage API
│   ├── backup/               # Резервное копирование
│   ├── email/                # Email сервис
│   ├── metrics/              # Метрики приложения
│   ├── config/               # Конфигурация
│   └── utils/                # Вспомогательные функции
│
├── hooks/                    # React Custom Hooks
│   ├── useApi.ts             # API запросы
│   ├── useConnect.ts         # Соединение и восстановление
│   ├── useDebounce.ts        # Debounce для поиска
│   ├── useCopyDocumentLink.ts
│   └── ...
│
├── wrappers/                 # React Context провайдеры
│   ├── AuthWrapper.tsx       # Аутентификация
│   ├── MainWrapper.tsx       # Основной контекст
│   ├── AdminWrapper.tsx      # Админ контекст
│   ├── UploadWrapper.tsx     # Загрузка файлов
│   └── NotificationsWrapper.tsx
│
├── types/                    # TypeScript типы
│   ├── document.status.ts    # Статусы документов
│   ├── user.ts               # Типы пользователей
│   ├── site.ts               # Типы центров
│   ├── study.ts              # Типы исследований
│   └── ...
│
├── messages/                 # i18n переводы
├── styles/                   # Глобальные стили
├── scripts/                  # Shell скрипты (backup/restore)
├── __tests__/                # Unit/Integration тесты
│   ├── auth.test.ts
│   ├── document-lifecycle.test.ts
│   ├── versioning.test.ts
│   ├── audit.test.ts
│   ├── rate-limiting.test.ts
│   └── ...
│
├── i18n.config.ts           # Конфигурация многоязычности
└── proxy.ts                 # HTTP прокси для API
```

## Требования к окружению

- **Node.js** >= 18
- **PostgreSQL** >= 12
- **S3-compatible storage** (AWS S3, YandexCloud S3, MinIO и т.д.)
- **Docker** (опционально, для контейнеризации)

## Установка и запуск

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd manpremotmf
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Конфигурация переменных окружения

Создайте файл `.env.local` на основе доступной конфигурации:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/etmf_db

# JWT & Security
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRATION=3600

# S3 / Object Storage
S3_ENDPOINT=https://storage.yandexcloud.net
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=your-bucket-name

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Инициализация базы данных

Выполните миграции для инициализации схемы БД:

```bash
# Миграции находятся в docs/migrations/
psql -U user -d etmf_db -f docs/migrations/001_add_account_lockout.sql
```

### 5. Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000`

### 6. Построение для production

```bash
npm run build
npm start
```

## Тестирование

### Запуск тестов

```bash
# Все тесты
npm test

# В режиме наблюдения
npm run test:watch

# С покрытием
npm run test:coverage
```

### Доступные тесты

- `auth.test.ts` — Аутентификация и JWT
- `document-lifecycle.test.ts` — Жизненный цикл документов
- `versioning.test.ts` — Версионирование
- `audit.test.ts` — Логирование и аудит
- `rate-limiting.test.ts` — Rate limiting
- `permissions-mismatch.test.ts` — Проверка прав доступа
- `review-workflow.test.ts` — Рецензирование
- `file-security.test.ts` — Безопасность файлов
- И другие...

## Главные компоненты системы

### Управление документами
- **DocumentActions.tsx** — Контекстное меню действий
- **DocumentModeToggle.tsx** — Переключение режима просмотра
- **DocumentStatusBadge.tsx** — Визуальный индикатор статуса
- **PDFViewer.tsx** — Встроенный просмотр PDF
- **FolderExplorer/** — Навигация по структуре документов

### Административные функции
- **Управление пользователями** — CRUD операции, ролевое управление
- **Управление исследованиями** — Создание, редактирование, удаление
- **Управление центрами** — Присвоение центров к исследованиям
- **Просмотр аудита** — История всех действий в системе
- **Метрики** — Статистика использования системы

### Аутентификация
- **Multi-factor support** — Поддержка различных методов входа
- **Session management** — Управление сессиями и токенами
- **Account lockout** — Защита от перебора паролей
- **Password reset** — Сброс пароля через email

### Рецензирование
- **Workflow management** — Управление процессом ревью
- **Comments** — Комментарии на документы
- **Notifications** — Уведомления рецензентов
- **History** — История рецензирования

## Безопасность

### Реализованные меры
- ✅ JWT-аутентификация с переиспользуемыми токенами
- ✅ Автоматическое обновление токенов (refresh token mechanism)
- ✅ Rate limiting на все API endpoints
- ✅ CSRF protection
- ✅ CORS configuration
- ✅ Security headers (Helmet)
- ✅ Account lockout после неудачных попыток входа
- ✅ Валидация входных данных (Joi)
- ✅ Хеширование паролей (bcrypt)
- ✅ Idle timeout (logout при неактивности)
- ✅ Полная система аудита

### Документация по безопасности
- [SECURITY.md](docs/SECURITY.md) — Общие требования безопасности
- [FILE_SECURITY.md](docs/FILE_SECURITY.md) — Безопасность файлов
- [SECURITY_HEADERS_CORS_CSRF.md](docs/SECURITY_HEADERS_CORS_CSRF.md) — Headers конфигурация
- [RATE_LIMITING.md](docs/RATE_LIMITING.md) — Rate limiting правила

## Развёртывание

### Docker

```bash
# Построить образ
docker build -t etmf:latest .

# Запустить контейнер
docker run -p 3000:3000 --env-file .env.local etmf:latest
```

### Резервное копирование

```bash
# Создать backup БД + S3
./src/scripts/backup.sh

# Восстановить из backup
./src/scripts/restore.sh
```

## Версионирование

Проект использует [Semantic Versioning](https://semver.org):

- **MAJOR** — несовместимые изменения
- **MINOR** — новые функции (backward compatible)
- **PATCH** — исправления ошибок


---

**Последнее обновление:** май 2026