import { getIAMToken } from '@/lib/yc-iam';


function encodeMetadata(value: string): string {
  return Buffer.from(value).toString('base64');
}

export async function uploadFileWithIAM(
  bucket: string,
  key: string,
  fileBuffer: Buffer,
  contentType: string,
  metadata: Record<string, string>
) {
  const iamToken = await getIAMToken();
  const url = `https://storage.yandexcloud.net/${bucket}/${key}`;
  const headers: Record<string, string> = {
    Host: 'storage.yandexcloud.net',
    'Content-Type': contentType,
    'Content-Length': fileBuffer.length.toString(),
    Authorization: `Bearer ${iamToken}`,
  };
  Object.entries(metadata).forEach(([k, value]) => {
    headers[`X-Amz-Meta-${k.toLowerCase()}`] = encodeMetadata(value);
  });
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: new Uint8Array(fileBuffer),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  return true;
}