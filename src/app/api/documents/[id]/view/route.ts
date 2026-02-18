// app/api/documents/[id]/view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { getIAMToken } from '@/lib/yc-iam';
import { createHash } from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const client = await connectDB();
  
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
      console.error('Failed to fetch from storage:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch document from storage' },
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    // Вычисляем ETag на основе содержимого, если его нет в БД
    const contentEtag = document.checksum 
      ? etag 
      : `"${createHash('md5').update(Buffer.from(arrayBuffer)).digest('hex')}"`;

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
    console.error('Error serving PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}