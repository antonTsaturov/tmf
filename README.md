# eTMF

`eTMF` — веб-система управления Trial Master File для клинических исследований.  
Проект покрывает полный цикл работы с документами: загрузка, версионирование, рецензирование, аудит, архивирование, восстановление и администрирование исследований/центров/пользователей.

![Main window](public/preview.png)

## Что делает система

- Управляет документами исследования на уровнях `GENERAL`, `COUNTRY`, `SITE`
- Поддерживает жизненный цикл документа (`draft` -> `in_review` -> `approved` -> `archived`)
- Хранит версии документов и позволяет откатываться/восстанавливать
- Дает ролевой доступ (admin, monitor, investigator и др.) с проверкой прав на действия
- Ведет аудит действий пользователей с метаданными запроса
- Поддерживает экспорт и администрирование данных через UI и API

## Технологический стек

### Core
- Next.js `16.1.6` (App Router)
- React `19.2.3`
- TypeScript `^5`

### Backend и инфраструктура
- PostgreSQL (`pg`)
- Object Storage через AWS SDK v3 (используется с YC S3-compatible endpoint)
- JWT-аутентификация (`jsonwebtoken`)
- Безопасность: `helmet`, `express-rate-limit`, CSRF/CORS middleware
- Email/уведомления: `resend`, `@react-email/components`

### UI
- Radix UI (`@radix-ui/themes` и пакеты меню)
- CSS-модули и кастомные стили в `src/styles`

## Архитектура проекта

```text
src/
  app/                 # страницы и API route handlers (Next App Router)
    api/               # backend-эндпоинты
  components/          # UI-компоненты (основные, admin, panels)
  hooks/               # React-хуки для API и UI-состояния
  wrappers/            # контексты приложения (auth/main/admin/upload/notifications)
  domain/              # доменные правила, transitions, policy
  lib/                 # db, auth, audit, security, cloud, metrics, backup, email
  types/               # типы доменных сущностей и API
  __tests__/           # unit/integration-like тесты бизнес-логики
  scripts/             # shell-скрипты backup/restore
```

## Основные страницы

- `/login` — вход в систему, запуск flow восстановления пароля
- `/reset-password` — установка нового пароля по токену
- `/home` — основной рабочий интерфейс eTMF
  - навигация по исследованию/стране/центру
  - дерево папок и список документов
  - действия с документами (upload/review/archive/delete/restore/rename)
  - preview PDF и карточка метаданных
- `/reviews` — очередь документов, назначенных на рецензию
- `/admin` — административные разделы (studies, sites, users, audit, deleted docs, archivation, export)

## API (кратко)

### Auth и системные
- `POST /api/auth/login`
- `GET /api/auth/check`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`
- `GET /api/csrf`
- `GET /api/ping`

### Documents
- `GET/POST /api/documents`
- `POST /api/documents/upload`
- `GET /api/documents/upload/allowed-types`
- `GET /api/documents/[id]/view`
- `GET /api/documents/[id]/versions`
- `GET /api/documents/[id]/versions/[number]/download`
- `POST /api/documents/[id]/actions`
- `DELETE /api/documents/[id]/delete`
- `POST /api/documents/[id]/restore`
- `POST /api/documents/[id]/archive`
- `POST /api/documents/[id]/unarchive`
- `PUT /api/documents/[id]/rename`
- `GET/POST /api/documents/archive`
- `GET /api/documents/deleted`
- `GET /api/documents/stats`
- `GET /api/documents/export`
- `GET /api/documents/reviews/pending`

### Справочники и админ-функции
- `GET/POST/DELETE /api/study`
- `GET/POST/DELETE /api/site`
- `GET/POST/DELETE /api/users`
- `GET /api/users/reviewers`
- `GET /api/audit`
- `GET /api/metrics/study`
- `GET /api/metrics/sites`
- `GET/POST /api/admin/backup` (`action=run|cleanup`, GET - статус)

## Доменная логика

Ключевая логика по доступным действиям с документом вынесена в:

- `src/domain/document/document.policy.ts` — матрица ролей и действий
- `src/domain/document/document.transitions.ts` — переходы статусов
- `src/domain/document/document.logic.ts` — итоговый расчет доступных операций (`getAvailableDocumentActions`)

## Контексты и состояние

В `src/app/layout.tsx` подключены глобальные провайдеры:

- `AuthProvider`
- `NotificationProvider`
- `AdminContextProvider`
- `UploadProvider`
- `ContextProvider` (`MainContext`)

Основные контексты:
- `MainContext` — UI-состояние главного экрана
- `AuthProvider` — текущий пользователь, auth-check, token refresh
- `AdminContext` — данные/CRUD для админ-панелей
- `UploadContext` — состояния upload/preview/new version

## Безопасность

- JWT cookies + проверка авторизации в `src/proxy.ts`
- Security headers (`helmet`/custom headers)
- CORS и preflight обработка
- CSRF-токены через `GET /api/csrf`
- Rate limiting на чувствительных маршрутах
- Аудит действий (`src/lib/audit`)
- Валидация env при старте через `src/lib/config/env.ts` (подключается в `next.config.ts`)

## Переменные окружения

Скопируйте шаблон:

```bash
cp .env.local.example .env.local
```

Минимально обязательные переменные:

- `JWT_SECRET`
- `DATABASE_URL`
- `YC_IAM_KEY_PATH`
- `NODE_ENV` (`development|production|test`)

Часто используемые дополнительные:

- `NEXT_PUBLIC_API_BASE_URL`
- `CORS_ORIGINS`
- `MAX_FILE_SIZE`
- `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`
- backup-переменные из `.env.local.example` (`DB_*`, `BACKUP_*`, `SOURCE_S3_BUCKET`, и т.д.)

## Локальный запуск

```bash
npm install
npm run dev
```

Скрипты:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:watch
npm run test:coverage
npm run test:ci
```

## Тестирование

Тесты находятся в `src/__tests__` и покрывают:

- auth/access control
- document lifecycle
- versioning
- audit logging
- account locking
- file security
- rate limiting

Документация по тестам: `src/__tests__/README.md`

## Docker

Проект содержит multi-stage `Dockerfile` и использует `output: 'standalone'` в Next-конфиге.

Базовый сценарий:

```bash
docker build -t etmf .
docker run --env-file .env.local -p 3000:3000 etmf
```

## Backup и восстановление

Скрипты:

- `src/scripts/backup.sh`
- `src/scripts/restore.sh`

Примеры:

```bash
./src/scripts/backup.sh
./src/scripts/restore.sh --list
./src/scripts/restore.sh
./src/scripts/restore.sh --db-only
./src/scripts/restore.sh --s3-only
```

API для ручного запуска/чистки/статуса: `GET/POST /api/admin/backup`

## Полезная документация

- `docs/SECURITY.md`
- `docs/SECURITY_HEADERS_CORS_CSRF.md`
- `docs/RATE_LIMITING.md`
- `docs/LOGGING.md`
- `docs/FILE_SECURITY.md`
- `CHANGELOG.md`

## Важные замечания

- Не храните реальные ключи и секреты в репозитории.
- Для production используйте внешний secret manager.
- При изменении бизнес-статусов документов синхронизируйте:
  - `document.transitions.ts`
  - `document.policy.ts`
  - тесты в `src/__tests__`
