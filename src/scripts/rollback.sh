#!/bin/bash
set -e

echo "🔄 Поиск предыдущей версии образа..."

# Найти предыдущую версию (исключая текущий latest)
CURRENT_IMAGE=$(docker inspect tmf-app --format='{{.Image}}' 2>/dev/null || echo "")

# Найти все образы, отсортированные по времени создания (новые сверху)
IMAGES=$(docker images ghcr.io/antontsaturov/tmf-app --format "{{.ID}} {{.CreatedAt}}" | sort -k2 -r | awk '{print $1}')

# Выбрать первую (не текущую) версию
PREVIOUS_IMAGE=""
for img in $IMAGES; do
    if [ "$img" != "$CURRENT_IMAGE" ]; then
        PREVIOUS_IMAGE=$img
        break
    fi
done

if [ -z "$PREVIOUS_IMAGE" ]; then
    echo "❌ Не найдено предыдущих версий образа"
    echo "Доступные образы:"
    docker images ghcr.io/antontsaturov/tmf-app
    exit 1
fi

echo "✅ Найден образ для отката: $PREVIOUS_IMAGE"
echo "📋 Информация об образе:"
docker images | grep "$PREVIOUS_IMAGE"

# Спрашиваем подтверждение
read -p "Выполнить откат? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Откат отменён"
    exit 0
fi

# Сохраняем текущий образ как failed-версию на случай повторного отката
docker tag "$CURRENT_IMAGE" ghcr.io/antontsaturov/tmf-app:failed-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

# Останавливаем и удаляем текущий контейнер
echo "🛑 Остановка текущего контейнера..."
docker stop tmf-app && docker rm tmf-app || true

# Запускаем со старой версией
echo "🚀 Запуск предыдущей версии..."
docker run -d \
  --name tmf-app \
  --restart always \
  -p 127.0.0.1:3000:3000 \
  --env-file /home/anton/.env \
  "$PREVIOUS_IMAGE"

# Проверяем, что контейнер запустился
sleep 3
if docker ps | grep -q tmf-app; then
    echo "✅ Откат выполнен успешно!"
    echo "📋 Последние логи:"
    docker logs tmf-app --tail 20
else
    echo "❌ Ошибка: контейнер не запустился"
    exit 1
fi