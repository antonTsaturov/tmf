
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
