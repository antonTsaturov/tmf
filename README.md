# Manpremotmf — eTMF

**Manpremotmf** — электронная система управления Trial Master File (eTMF) для клинических исследований.

## Назначение

Система для управления документами Trial Master File в фармацевтических/клинических испытаниях: исследования (studies), исследовательские центры (sites), структурированное хранение и версионирование документов.

## Стек технологий

| Компонент | Технология |
|-----------|------------|
| Frontend | Next.js 16, React 19, Radix UI |
| Backend | Next.js API Routes |
| База данных | PostgreSQL |
| Файлы | AWS S3 |

## Доменная модель

| Сущность | Описание |
|----------|----------|
| **Study** | Исследование (протокол, спонсор, CRO, страны, статусы: planned/ongoing/completed и др.) |
| **Site** | Исследовательский центр (клиника, страна, город, PI, статусы: planned/opened/closed) |
| **Document** | Документ TMF с версиями, привязкой к папкам (tmf_zone, tmf_artifact) |
| **User** | Пользователь с ролями (admin, study_manager, monitor, investigator и др.) и организациями (CRO, SPONSOR, SITE) |

## Функциональность

- **Документы**: загрузка, просмотр PDF, версионирование, удаление
- **Структура папок**: управление иерархией TMF-папок
- **Исследования**: управление списком исследований
- **Центры**: управление сайтами
- **Пользователи**: управление пользователями и правами (просмотр, загрузка, одобрение и т.п.)
- **Audit Trail**: полный журнал аудита действий
- **Аутентификация**: вход/выход, JWT, проверка прав

## Структура src

```
src/
├── app/           — страницы и API routes (Next.js App Router)
├── components/    — UI-компоненты (FileExplorer, PDFViewer и др.)
├── lib/           — БД (PostgreSQL schema), аудит, auth
├── hooks/         — хуки (useModal, useStudies и др.)
├── wrappers/      — провайдеры контекста (AuthProvider, AdminContext)
├── utils/         — утилиты
├── types/         — TypeScript типы
└── styles/        — CSS стили
```

## Запуск

```bash
npm run dev   # режим разработки
npm run build # сборка
npm run start # production
```
