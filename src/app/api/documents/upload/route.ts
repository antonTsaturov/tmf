// // app/api/documents/upload/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// import { connectDB, createTable } from '@/lib/db/index';
// import { Tables } from '@/lib/db/schema';
// import { v4 as uuidv4 } from 'uuid';
// import { createHash } from 'crypto';
// import { getIAMToken } from '@/lib/yc-iam';

// // Функция для создания S3 клиента с IAM токеном
// async function createS3ClientWithIAM() {
//   try {
//     const iamToken = await getIAMToken();
    
//     return new S3Client({
//       region: process.env.YC_REGION || 'ru-central1',
//       endpoint: process.env.YC_ENDPOINT,
//       credentials: {
//         accessKeyId: 'temp', // Не используется при IAM аутентификации
//         secretAccessKey: 'temp', // Не используется при IAM аутентификации
//         sessionToken: iamToken, // IAM токен передается как sessionToken
//       },
//       forcePathStyle: true, // Важно для Yandex Cloud
//     });
//   } catch (error) {
//     console.error('Error creating S3 client with IAM:', error);
//     throw error;
//   }
// }

// export async function POST(request: NextRequest) {
//   const client = await connectDB();
  
//   try {
//     // Убеждаемся что таблицы существуют
//     await createTable(Tables.DOCUMENT);
//     await createTable(Tables.DOCUMENT_VERSION);

//     const formData = await request.formData();
    
//     const file = formData.get('file') as File;
//     const documentId = formData.get('documentId') as string;
//     const versionId = formData.get('versionId') as string;
//     const s3Key = formData.get('s3Key') as string;
//     const studyId = parseInt(formData.get('studyId') as string);
//     const siteId = formData.get('siteId') as string;
//     const folderId = formData.get('folderId') as string;
//     const folderName = formData.get('folderName') as string;
//     const createdBy = formData.get('createdBy') as string;
//     const fileName = formData.get('fileName') as string;
//     const fileSize = parseInt(formData.get('fileSize') as string);
//     const fileType = formData.get('fileType') as string;
//     const tmfZone = formData.get('tmfZone') as string | null;
//     const tmfArtifact = formData.get('tmfArtifact') as string | null;

//     console.log('formData: ',formData);
//     // Валидация
//     if (
//       !file ||
//       studyId === undefined ||
//       Number.isNaN(studyId) ||
//       !siteId ||
//       !folderId ||
//       !folderName ||
//       !createdBy
//     ) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     // Проверка типа файла
//     // if (file.type !== 'application/pdf') {
//     //   return NextResponse.json(
//     //     { error: 'Only PDF files are allowed' },
//     //     { status: 400 }
//     //   );
//     // }

//     // Конвертируем файл в буфер
//     const buffer = Buffer.from(await file.arrayBuffer());

//     // Проверка размера файла (100MB максимум)
//     const maxSize = 100 * 1024 * 1024;
//     if (buffer.length > maxSize) {
//       return NextResponse.json(
//         { error: 'File too large. Maximum size is 100MB' },
//         { status: 400 }
//       );
//     }

//     // Вычисляем checksum
//     const checksum = createHash('sha256').update(buffer).digest('hex');

//     // Создаем S3 клиент с IAM токеном
//     const s3Client = await createS3ClientWithIAM();

//     // Загружаем файл в S3
//     const uploadParams = {
//       Bucket: process.env.YC_BUCKET_NAME!,
//       Key: s3Key,
//       Body: buffer,
//       ContentType: file.type,
//       Metadata: {
//         documentId,
//         versionId,
//         studyId: studyId.toString(),
//         siteId,
//         folderId,
//         fileName,
//         uploadedBy: createdBy,
//       },
//     };

//     const uploadCommand = new PutObjectCommand(uploadParams);
//     await s3Client.send(uploadCommand);

//     // Генерируем URL для доступа к файлу
//     const fileUrl = `${process.env.YC_ENDPOINT}/${process.env.YC_BUCKET_NAME}/${s3Key}`;

//     // Создаем запись документа в БД
//     const { rows: [newDocument] } = await client.query(`
//       INSERT INTO document (
//         id, study_id, site_id, folder_id, folder_name, 
//         tmf_zone, tmf_artifact, status, created_by
//       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//       RETURNING *
//     `, [
//       documentId,
//       studyId,
//       siteId,
//       folderId,
//       folderName,
//       tmfZone || null,
//       tmfArtifact || null,
//       'draft',
//       createdBy
//     ]);

//     // Определяем номер версии (проверяем существующие версии)
//     const { rows: existingVersions } = await client.query(`
//       SELECT COUNT(*) as count FROM document_version WHERE document_id = $1
//     `, [documentId]);
    
//     const versionNumber = (existingVersions[0]?.count || 0) + 1;

//     // Создаем запись версии документа
//     const { rows: [newVersion] } = await client.query(`
//       INSERT INTO document_version (
//         id, document_id, document_number, document_name,
//         file_name, file_path, file_type, file_size, checksum,
//         uploaded_by, change_reason
//       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//       RETURNING *
//     `, [
//       versionId,
//       documentId,
//       versionNumber,
//       fileName,
//       fileName,
//       fileUrl,
//       fileType,
//       fileSize,
//       checksum,
//       createdBy,
//       versionNumber === 1 ? 'Initial upload' : `Version ${versionNumber} upload`
//     ]);

//     return NextResponse.json({
//       document: {
//         ...newDocument,
//         current_version: newVersion,
//         versions: [newVersion]
//       }
//     }, { status: 201 });

//   } catch (error) {
//     console.error('Error uploading document:', error);
//     return NextResponse.json(
//       { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
//       { status: 500 }
//     );
//   } finally {
//     client.release();
//   }
// }

// // Endpoint для получения presigned URL для скачивания
// export async function GET(request: NextRequest) {
//   const searchParams = request.nextUrl.searchParams;
//   const key = searchParams.get('key');
  
//   if (!key) {
//     return NextResponse.json(
//       { error: 'Key is required' },
//       { status: 400 }
//     );
//   }

//   try {
//     const s3Client = await createS3ClientWithIAM();
    
//     const command = new PutObjectCommand({
//       Bucket: process.env.YC_BUCKET_NAME!,
//       Key: key,
//     });

//     const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
//     return NextResponse.json({ url });
//   } catch (error) {
//     console.error('Error generating presigned URL:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { connectDB, createTable } from '@/lib/db/index';
import { Tables } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { getIAMToken } from '@/lib/yc-iam';

// Функция для загрузки файла напрямую через fetch с IAM токеном
async function uploadFileWithIAM(
  bucket: string,
  key: string,
  fileBuffer: Buffer,
  contentType: string,
  metadata: Record<string, string>
) {
  try {
    const iamToken = await getIAMToken();
    
    // Формируем URL для загрузки
    const url = `https://storage.yandexcloud.net/${bucket}/${key}`;
    
    // Подготавливаем заголовки
    const headers: Record<string, string> = {
      'Host': 'storage.yandexcloud.net',
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
      'Authorization': `Bearer ${iamToken}`,
    };
    
    // Добавляем метаданные
    Object.entries(metadata).forEach(([key, value]) => {
      headers[`X-Amz-Meta-${key.toLowerCase()}`] = value;
    });

    console.log('Uploading with IAM token:', {
      url,
      bucket,
      key,
      contentType,
      fileSize: fileBuffer.length,
      tokenPrefix: iamToken.substring(0, 20) + '...'
    });

    // Конвертируем Buffer в Uint8Array для fetch в Node.js среде
    const uint8Array = new Uint8Array(fileBuffer);

    // Загружаем файл
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: uint8Array, // Используем Uint8Array вместо Buffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log('Upload successful:', response.status);
    return true;
  } catch (error) {
    console.error('Error in uploadFileWithIAM:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const client = await connectDB();
  
  try {
    // Убеждаемся что таблицы существуют
    await createTable(Tables.DOCUMENT);
    await createTable(Tables.DOCUMENT_VERSION);

    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string;
    const versionId = formData.get('versionId') as string;
    const s3Key = formData.get('s3Key') as string;
    const studyId = parseInt(formData.get('studyId') as string);
    const siteId = formData.get('siteId') as string;
    const folderId = formData.get('folderId') as string;
    const folderName = formData.get('folderName') as string;
    const createdBy = formData.get('createdBy') as string;
    const fileName = formData.get('fileName') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);
    const fileType = formData.get('fileType') as string;
    const tmfZone = formData.get('tmfZone') as string | null;
    const tmfArtifact = formData.get('tmfArtifact') as string | null;

    console.log('Uploading file:', {
      documentId,
      versionId,
      s3Key,
      studyId,
      siteId,
      folderId,
      fileName,
      fileSize,
      fileType
    });

    // Валидация
    if (
      !file ||
      studyId === undefined ||
      Number.isNaN(studyId) ||
      !siteId ||
      !folderId ||
      !folderName ||
      !createdBy
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Конвертируем файл в буфер
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Проверка размера файла (100MB максимум)
    const maxSize = 100 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB' },
        { status: 400 }
      );
    }

    // Вычисляем checksum
    const checksum = createHash('sha256').update(buffer).digest('hex');

    // Загружаем файл в S3 используя IAM токен
    try {
      await uploadFileWithIAM(
        process.env.YC_BUCKET_NAME!,
        s3Key,
        buffer,
        file.type,
        {
          documentid: documentId,
          versionid: versionId,
          studyid: studyId.toString(),
          siteid: siteId,
          folderid: folderId,
          filename: fileName,
          uploadedby: createdBy,
        }
      );
    } catch (uploadError) {
      console.error('Failed to upload to S3:', uploadError);
      return NextResponse.json(
        { 
          error: 'Failed to upload file to storage', 
          details: uploadError instanceof Error ? uploadError.message : String(uploadError) 
        },
        { status: 500 }
      );
    }

    // Генерируем URL для доступа к файлу
    const fileUrl = `https://storage.yandexcloud.net/${process.env.YC_BUCKET_NAME}/${s3Key}`;

    // Создаем запись документа в БД
    const { rows: [newDocument] } = await client.query(`
      INSERT INTO document (
        id, study_id, site_id, folder_id, folder_name, 
        tmf_zone, tmf_artifact, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      documentId,
      studyId,
      siteId,
      folderId,
      folderName,
      tmfZone || null,
      tmfArtifact || null,
      'draft',
      createdBy
    ]);

    // Определяем номер версии
    const { rows: existingVersions } = await client.query(`
      SELECT COUNT(*) as count FROM document_version WHERE document_id = $1
    `, [documentId]);
    
    const versionNumber = (existingVersions[0]?.count || 0) + 1;

    // Создаем запись версии документа
    const { rows: [newVersion] } = await client.query(`
      INSERT INTO document_version (
        id, document_id, document_number, document_name,
        file_name, file_path, file_type, file_size, checksum,
        uploaded_by, change_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      versionId,
      documentId,
      versionNumber,
      fileName,
      fileName,
      fileUrl,
      fileType,
      fileSize,
      checksum,
      createdBy,
      versionNumber === 1 ? 'Initial upload' : `Version ${versionNumber} upload`
    ]);

    return NextResponse.json({
      document: {
        ...newDocument,
        current_version: newVersion,
        versions: [newVersion]
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Детальный вывод ошибки
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : 'Unknown'
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Endpoint для получения presigned URL для скачивания
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  
  if (!key) {
    return NextResponse.json(
      { error: 'Key is required' },
      { status: 400 }
    );
  }

  try {
    const iamToken = await getIAMToken();
    
    // Для скачивания используем прямой URL с IAM токеном
    const url = `https://storage.yandexcloud.net/${process.env.YC_BUCKET_NAME}/${key}`;
    
    return NextResponse.json({ 
      url,
      headers: {
        'Authorization': `Bearer ${iamToken}`
      }
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}