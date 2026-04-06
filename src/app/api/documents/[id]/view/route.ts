// app/api/documents/[id]/view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/index';
import { logger } from '@/lib/utils/logger';
import { getIAMToken } from '@/lib/cloud/yc-iam';
import { createHash } from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const client = getPool();
  
  try {
    // Получаем информацию о документе
    const { rows } = await client.query(`
      SELECT d.*, dv.file_path, dv.file_name, dv.file_type, dv.checksum, d.created_at as updated_at
      FROM document d
      LEFT JOIN document_version dv ON d.current_version_id = dv.id
      WHERE d.id = $1
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = rows[0];
    
    if (!document.file_path) {
      return NextResponse.json(
        { error: 'Document file not found' },
        { status: 404 }
      );
    }

    if (!document.file_type?.includes('pdf')) {
      return NextResponse.json(
        { error: 'File is not a PDF' },
        { status: 400 }
      );
    }

    // Генерируем ETag из checksum или из данных документа
    // Если есть checksum из БД - используем его
    // Если нет - создаем на основе id и updated_at
    const etag = document.checksum 
      ? `"${document.checksum}"`
      : `"${createHash('md5').update(document.id + (document.updated_at || '')).digest('hex')}"`;

    // Проверяем If-None-Match заголовок
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Получаем IAM токен
    const iamToken = await getIAMToken();

    // Загружаем файл с Yandex Cloud Object Storage
    const response = await fetch(document.file_path, {
      headers: {
        'Authorization': `Bearer ${iamToken}`
      }
    });

    if (!response.ok) {
      logger.error('Failed to fetch from storage', null, { status: response.status, statusText: response.statusText });
      return NextResponse.json(
        { error: 'Failed to fetch document from storage' },
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    // 🔒 Проверка контрольной суммы для целостности файла
    const calculatedChecksum = createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex');
    
    if (document.checksum && calculatedChecksum !== document.checksum.toLowerCase()) {
      logger.error('Checksum verification failed', null, {
        documentId: id,
        expected: document.checksum,
        calculated: calculatedChecksum,
        fileName: document.file_name
      });
      
      return NextResponse.json(
        { 
          error: 'File integrity check failed',
          message: 'The file has been corrupted or modified in storage'
        },
        { status: 500 }
      );
    }

    // Вычисляем ETag на основе содержимого
    const contentEtag = document.checksum ? etag : `"${calculatedChecksum}"`;

    // Возвращаем PDF с ETag
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${document.file_name || 'document.pdf'}"`,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'ETag': contentEtag,
        'Last-Modified': new Date(document.updated_at || Date.now()).toUTCString(),
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    logger.error('Error serving PDF', error instanceof Error ? error : null);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } 
}