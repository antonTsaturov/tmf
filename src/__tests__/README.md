# eTMF Test Suite

Комплексный набор тестов для системы управления документами клинических исследований (eTMF).

## 📋 Обзор

Тесты покрывают следующую бизнес-логику:

| Категория | Файл | Описание |
|-----------|------|----------|
| 🔐 Auth & Access Control | `auth.test.ts` | JWT, роли, разрешения, доступ к исследованиям |
| 📄 Document Lifecycle | `document-lifecycle.test.ts` | Статусы, переходы, валидация действий |
| 📚 Versioning | `versioning.test.ts` | Версионирование документов, checksum |
| 📝 Audit Logging | `audit.test.ts` | Логирование событий, метаданные |
| 🔒 Account Locking | `account-locking.test.ts` | Блокировка после 5 ошибок |
| 🛡️ File Security | `file-security.test.ts` | MIME types, magic numbers, размеры |
| 🚦 Rate Limiting | `rate-limiting.test.ts` | Ограничение запросов по IP |

## 🚀 Запуск тестов

```bash
# Запустить все тесты
npm run test

# Запустить в режиме watch (автоматически при изменениях)
npm run test:watch

# Запустить с покрытием кода
npm run test:coverage

# Запустить для CI (2 воркера)
npm run test:ci
```

## 📁 Структура тестов

```
src/__tests__/
├── setup.ts                    # Глобальные моки и утилиты
├── auth.test.ts                # Аутентификация и авторизация
├── document-lifecycle.test.ts  # Жизненный цикл документов
├── versioning.test.ts          # Версионирование
├── audit.test.ts               # Аудит логирование
├── account-locking.test.ts     # Блокировка аккаунтов
├── file-security.test.ts       # Безопасность файлов
└── rate-limiting.test.ts       # Rate limiting
```

## 🧪 Детальное описание тестов

### 1. Auth & Access Control (`auth.test.ts`)

**Что тестируется:**
- Генерация и верификация JWT токенов
- Хеширование и сравнение паролей (bcrypt)
- Матрица разрешений (ActionRoleMap)
- Доступные действия для документов (getAvailableDocumentActions)

**Ключевые тесты:**
```typescript
// Проверка матрицы разрешений
expect(ActionRoleMap[DocumentAction.APPROVE]).toContain(UserRole.ADMIN);
expect(ActionRoleMap[DocumentAction.APPROVE]).not.toContain(UserRole.MONITOR);

// Проверка доступных действий для статуса
const actions = getAvailableDocumentActions(doc, [UserRole.MONITOR], 'opened', 'ongoing');
expect(actions).toContain(DocumentAction.SUBMIT_FOR_REVIEW);
expect(actions).not.toContain(DocumentAction.APPROVE);
```

### 2. Document Lifecycle (`document-lifecycle.test.ts`)

**Что тестируется:**
- Переходы между статусами (Transitions)
- Влияние статуса сайта (SiteStatusTransitions)
- Влияние статуса исследования (StudyStatusTransitions)
- Недопустимые переходы

**Статусы документа:**
```
draft → in_review → approved → archived
   ↓        ↓           ↓
   └────────┴───────────┘ (reject → draft)
```

**Ключевые тесты:**
```typescript
// Из draft нельзя перейти напрямую в approved
expect(Transitions['draft']).not.toContain(DocumentAction.APPROVE);

// Из in_review можно approve или reject
expect(Transitions['in_review']).toContain(DocumentAction.APPROVE);
expect(Transitions['in_review']).toContain(DocumentAction.REJECT);
```

### 3. Versioning (`versioning.test.ts`)

**Что тестируется:**
- Инкремент номера версии
- Сохранение старых версий
- Уникальность checksum
- Метаданные версий

**Ключевые тесты:**
```typescript
expect(version2.document_number).toBe(version1.document_number + 1);
expect(version1.checksum).not.toBe(version2.checksum);
```

### 4. Audit Logging (`audit.test.ts`)

**Что тестируется:**
- Создание audit записей
- Извлечение метаданных (IP, user agent, session)
- Массовая запись (bulkLog)
- Обработка ошибок сериализации

**Ключевые тесты:**
```typescript
await AuditService.log({
  action: 'APPROVE',
  entity_type: 'DOCUMENT',
  user_id: 'user-123',
  // ...
});
expect(mockQuery).toHaveBeenCalledWith(
  expect.stringContaining('INSERT INTO audit'),
  expect.any(Array)
);
```

### 5. Account Locking (`account-locking.test.ts`)

**Что тестируется:**
- Блокировка после 5 неудачных попыток
- 15-минутная длительность блокировки
- Сброс счетчика при успешном входе
- Проверка статуса пользователя

**Ключевые тесты:**
```typescript
// 5 неудачных попыток → блокировка
expect(failedAttempts).toBe(5);
expect(lockUntil).toBeGreaterThan(Date.now());

// Успешный вход сбрасывает счетчик
expect(successfulUser.failed_login_attempts).toBe(0);
```

### 6. File Security (`file-security.test.ts`)

**Что тестируется:**
- Валидация MIME типов (whitelist)
- Блокировка расширений (.exe, .js, .php, etc.)
- Magic number detection (MZ, ELF, Mach-O)
- Ограничение размера (100MB)
- Предотвращение path traversal

**Ключевые тесты:**
```typescript
// Блокировка исполняемых файлов
const result = validateFileUpload({ name: 'malware.exe' }, buffer);
expect(result.valid).toBe(false);
expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');

// Обнаружение по magic number
const mzBuffer = Buffer.from([0x4D, 0x5A, ...]); // MZ signature
const result = validateFileUpload({ name: 'fake.pdf' }, mzBuffer);
expect(result.errorCode).toBe('EXECUTABLE_FILE_DETECTED');
```

### 7. Rate Limiting (`rate-limiting.test.ts`)

**Что тестируется:**
- Конфигурация лимитов для разных endpoints
- Подсчет запросов по IP
- Блокировка после превышения лимита

**Лимиты:**
| Endpoint | Лимит | Окно |
|----------|-------|------|
| Login | 5 | 15 мин |
| Change Password | 10 | 1 час |
| Upload | 20 | 1 час |
| Document API | 100 | 15 мин |
| Global | 200 | 15 мин |

## 🔧 Mocking

Тесты используют следующие моки:

```typescript
// База данных
jest.mock('@/lib/db', () => ({
  getPool: () => ({ query: jest.fn() }),
}));

// bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Logger
jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), /* ... */ },
}));

// UUID
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-12345'),
}));
```

## 📊 Покрытие кода

Запустите для отчета:
```bash
npm run test:coverage
```

Отчет будет в `coverage/lcov-report/index.html`

## 🎯 Добавление новых тестов

1. Создайте файл `*.test.ts` в `src/__tests__/`
2. Импортируйте тестируемый модуль
3. Используйте `describe` и `it` для структуры
4. Используйте `expect` для_assertions

**Пример:**
```typescript
import { myFunction } from '@/lib/my-module';

describe('MyModule', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

## 🚨 Known Issues

- Некоторые тесты могут требовать мокирования Next.js специфичных модулей
- Интеграционные тесты с реальной БД пока не реализованы
- E2E тесты требуют отдельной настройки

## 📚 Ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)
