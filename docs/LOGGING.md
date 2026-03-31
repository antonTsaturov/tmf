# 📊 Руководство по системе логирования

## 🎯 Обзор

Приложение использует структурированное логирование со следующей иерархией уровней:

| Уровень | Описание | Видно в dev | Видно в prod |
|---------|---------|-------------|--------------|
| **DEBUG** | Детальная информация для разработчиков | ✅ | ❌ |
| **INFO** | Основная информация о событиях | ✅ | ✅ |
| **WARN** | Предупреждения и ошибки аутентификации | ✅ | ✅ |
| **ERROR** | Критические ошибки | ✅ | ✅ |

---

## 📍 Где записываются логи

### 1. **КОНСОЛЬ (stdout/stderr)**
Логи всегда выводятся в консоль, откуда их можно:
- Просматривать в реальном времени
- Перенаправлять в файлы
- Отправлять в системы мониторинга

### 2. **ФАЙЛОВАЯ СИСТЕМА** (production)
Логи можно сохранять в файлы с помощью перенаправления потока:

```bash
npm run start > app.log 2>&1
```

Или использовать контейнеризацию (Docker, Kubernetes) для сбора логов.

---

## 🔍 Просмотр логов

### Режим разработки (npm run dev)

**Все логи видны в терминале в реальном времени:**

```bash
npm run dev

# Пример вывода:
[2026-03-31T10:23:45.123Z] [INFO] AUTH: LOGIN_SUCCESS | {"userId":"user-uuid-123","status":"Successfully logged in","ip":"192.168.1.1"}
[2026-03-31T10:24:10.456Z] [WARN] AUTH_ERROR: LOGIN_INVALID_PASSWORD | {"userId":"user-uuid-456","error":"Failed attempt 1/5","ip":"192.168.1.2"}
```

### Режим production (npm run start)

**1. Запуск с логированием в файл:**

```bash
npm run start > logs/app.log 2>&1 &

# Просмотр логов в реальном времени
tail -f logs/app.log

# Просмотр последних 100 строк
tail -100 logs/app.log

# Просмотр первых 50 строк
head -50 logs/app.log
```

**2. Фильтрация логов:**

```bash
# Все логи аутентификации
grep "AUTH" logs/app.log

# Только ошибки входа
grep "LOGIN_INVALID\|LOGIN_ACCOUNT" logs/app.log

# Все ERROR логи
grep "\[ERROR\]" logs/app.log

# Логи за определенное время
grep "2026-03-31T10:2[0-5]" logs/app.log

# Блокировки аккаунта
grep "LOGIN_ACCOUNT_BLOCKED" logs/app.log
```

**3. Анализ логов:**

```bash
# Количество попыток входа
grep "LOGIN_INVALID_PASSWORD" logs/app.log | wc -l

# Список заблокированных пользователей
grep "LOGIN_ACCOUNT_BLOCKED" logs/app.log | grep -o '"userId":"[^"]*"'

# Логи по IP адресу
grep '"ip":"192.168.1.1"' logs/app.log
```

---

## 📝 Что логируется

### 🔐 Аутентификация (AUTH)
```
AUTH: LOGIN_SUCCESS              — успешный вход
AUTH: LOGIN_FIRST_LOGIN_SUCCESS  — первый вход пользователя
AUTH_ERROR: LOGIN_INVALID_INPUT  — пустые поля
AUTH_ERROR: LOGIN_USER_NOT_FOUND — пользователь не найден
AUTH_ERROR: LOGIN_ACCOUNT_LOCKED — аккаунт заблокирован
AUTH_ERROR: LOGIN_INVALID_PASSWORD — неверный пароль
AUTH_ERROR: LOGIN_ACCOUNT_BLOCKED — аккаунт заблокирован после 5 попыток
AUTH_ERROR: LOGIN_ACCOUNT_TERMINATED — аккаунт деактивирован
```

Пример лога:
```
[2026-03-31T10:24:15.789Z] [WARN] AUTH_ERROR: LOGIN_INVALID_PASSWORD | {"userId":"abc-123","error":"Failed attempt 2/5","ip":"192.168.1.1"}
```

### 💾 База данных (DB)
```
DB: POOL_CONNECTED         — подключение к БД
DB: TABLE_ALREADY_EXISTS   — таблица уже существует
DB: TABLE_CREATED          — таблица создана
DB: CONSTRAINT_CREATED     — ограничение создано
DB_ERROR: CREATE_TABLE_FAILED — ошибка при создании таблицы
```

### 🌐 API
```
API: GET /api/documents      — запрос к API
API_ERROR: Internal server error — ошибка на сервере
```

### 📄 Документы (DOCUMENT)
```
DOCUMENT: UPLOAD_SUCCESS   — документ загружен
DOCUMENT: DELETE_SUCCESS   — документ удален
```

### 🔐 Аудит (AUDIT)
```
AUDIT: UPDATE_DOCUMENT — обновление документа с логированием всех изменений
```

---

## 🛠️ Использование логгера в коде

### Импорт
```typescript
import { logger } from '@/lib/logger';
```

### Примеры использования

**Логирование успешного события:**
```typescript
logger.info('User registered', { 
  userId: user.id, 
  email: user.email 
});
// Вывод: [2026-03-31T...] [INFO] User registered | {"userId":"abc-123","email":"user@example.com"}
```

**Логирование ошибки:**
```typescript
try {
  await saveToDatabase();
} catch (error) {
  logger.error('Database save failed', error, { 
    userId: user.id 
  });
  // Вывод: [2026-03-31T...] [ERROR] Database save failed | {"userId":"abc-123"}
  // + полный stack trace
}
```

**Специализированные методы:**
```typescript
// Аутентификация
logger.authLog('LOGIN_SUCCESS', user.id, 'Logged in', { ip: clientIp });

// БД операции
logger.dbLog('USER_INSERT', 'users', { count: 1 });

// API логирование
logger.apiLog('POST', '/api/documents/upload', 201);

// Документы
logger.documentLog('ARCHIVE', documentId, { reason: 'Completed' });

// Аудит
logger.auditLog('UPDATE', userId, 'document', documentId, { action: 'status_change' });
```

---

## 📊 Примеры анализа логов

### Сценарий 1: Отслеживание попыток входа пользователя

```bash
# Все попытки входа пользователя user-uuid-123
grep '"userId":"user-uuid-123"' logs/app.log | grep AUTH

# Вывод:
[2026-03-31T10:20:15.123Z] [WARN] AUTH_ERROR: LOGIN_INVALID_PASSWORD | {"userId":"user-uuid-123","error":"Failed attempt 1/5"}
[2026-03-31T10:20:30.456Z] [WARN] AUTH_ERROR: LOGIN_INVALID_PASSWORD | {"userId":"user-uuid-123","error":"Failed attempt 2/5"}
[2026-03-31T10:21:02.789Z] [WARN] AUTH_ERROR: LOGIN_ACCOUNT_BLOCKED | {"userId":"user-uuid-123","error":"Blocked after 5 failed attempts"}
```

### Сценарий 2: Ошибки на специфическом сервере

```bash
# Все ERROR логи за последний час
grep "\[ERROR\]" logs/app.log | tail -50

# Статистика по типам ошибок
cat logs/app.log | grep "\[ERROR\]" | grep -o "Error: [^|]*" | sort | uniq -c | sort -rn
```

### Сценарий 3: Мониторинг активности по IP

```bash
# Все логи с IP адреса (возможная атака)
grep '"ip":"192.168.1.100"' logs/app.log

# Количество запросов с IP
grep '"ip":"192.168.1.100"' logs/app.log | wc -l
```

---

## 🚀 Production setup

### Docker пример
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
CMD ["npm", "start"]
# Логи автоматически идут в stdout контейнера
```

### Docker Compose пример
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    # Логи автоматически собираются в /var/lib/docker/containers/
```

### Systemd сервис
```ini
[Service]
ExecStart=/usr/bin/npm start
StandardOutput=journal
StandardError=journal
SyslogIdentifier=app

# Просмотр логов:
journalctl -u app -f
journalctl -u app --since "2 hours ago"
```

---

## 📈 Лучшие практики

✅ **Всегда логируй:**
- Попытки аутентификации (успешные и неудачные)
- Критические операции с БД
- Ошибки и исключения
- Информацию о IP адресах (для безопасности)

❌ **Никогда не логируй:**
- Пароли
- Приватные ключи
- Полные кредитные карты
- Персональные данные без необходимости

🔒 **Для security:**
- Сохраняй логи как минимум 30 дней
- Используй логирование переходов состояния (особенно для финансовых операций)
- Мониторь попытки атак brute-force
- Отслеживай необычную активность по IP

---

## 🔗 Ссылки

- [Реализация логгера](../../src/lib/logger.ts)
- [Использование в auth](../../src/app/api/auth/login/route.ts)
- [Типы логирования](../../src/lib/logger.ts#L109)
