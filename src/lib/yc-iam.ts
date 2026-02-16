// // lib/yc-iam.ts
// import fs from 'fs';
// import path from 'path';

// interface IAMKey {
//   id: string;
//   service_account_id: string;
//   created_at: string;
//   key_algorithm: string;
//   public_key: string;
//   private_key: string;
// }

// let iamToken: string | null = null;
// let tokenExpiry: number | null = null;

// /**
//  * Получение IAM токена из файла с ключом
//  * В реальном проекте токен нужно обновлять каждые 12 часов
//  */
// export async function getIAMToken(): Promise<string> {
//   // Если токен еще действителен (11 часов), возвращаем его
//   if (iamToken && tokenExpiry && Date.now() < tokenExpiry) {
//     return iamToken;
//   }

//   try {
//     // Путь к файлу с IAM ключом (можно через env переменную)
//     const keyFilePath = './ya_cloud-iam_key.json';
//     const absolutePath = path.resolve(process.cwd(), keyFilePath);
    
//     // Читаем файл с ключом
//     const keyData: IAMKey = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
//     console.log('absolutePath', absolutePath)
//     // Формируем JWT для получения IAM токена
//     const now = Math.floor(Date.now() / 1000);
//     const payload = {
//       iss: keyData.service_account_id,
//       aud: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
//       iat: now,
//       exp: now + 3600, // 1 час
//     };

//     // Создаем подпись JWT (в production используйте библиотеку jsonwebtoken)
//     // Для простоты используем готовую подпись из ключа
//     // В реальном проекте нужно использовать jsonwebtoken или аналоги
    
//     // Здесь мы используем упрощенный подход - отправляем ключ на сервер Yandex
//     // Yandex IAM сам проверит ключ и выдаст токен
//     const response = await fetch('https://iam.api.cloud.yandex.net/iam/v1/tokens', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         jwt: keyData.private_key, // В реальном проекте здесь должен быть подписанный JWT
//       }),
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to get IAM token: ${response.statusText}`);
//     }

//     const data = await response.json();
//     iamToken = data.iamToken;
//     tokenExpiry = Date.now() + 11 * 60 * 60 * 1000; // 11 часов (токен живет 12 часов)
    
//     if (iamToken) {
//         return iamToken;
//     } else {
//         return 'No token';
//     }

//   } catch (error) {
//     console.error('Error getting IAM token:', error);
//     throw error;
//   }
// }

import fs from 'fs';
import jwt from 'jsonwebtoken';

export async function getIAMToken() {
  const key = JSON.parse(
    fs.readFileSync('ya_cloud-iam_key.json', 'utf8')
  );

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    aud: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
    iss: key.service_account_id,
    sub: key.service_account_id,
    iat: now,
    exp: now + 360,
  };

  const privateKey = key.private_key.replace(/\\n/g, '\n');

  const token = jwt.sign(payload, privateKey, {
    algorithm: 'PS256',
    keyid: key.id,
  });

  const response = await fetch(
    'https://iam.api.cloud.yandex.net/iam/v1/tokens',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwt: token }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get IAM token: ${text}`);
  }

  const data = await response.json();
  return data.iamToken;
}
