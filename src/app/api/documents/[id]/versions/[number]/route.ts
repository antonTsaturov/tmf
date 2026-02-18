// app/api/documents/[id]/versions/[number]/route.ts
// GET - скачать конкретную версию
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { getIAMToken } from '@/lib/yc-iam';
import { createHash } from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; number: string }> }
) {
  const { id, number } = await params;
  const versionNumber = parseInt(number, 10);

  if (isNaN(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
  }

  const client = await connectDB();

  try {
    const { rows } = await client.query(
      `SELECT dv.id, dv.document_id, dv.document_number, dv.file_path, dv.file_name, dv.file_type, dv.checksum, dv.uploaded_at
       FROM document_version dv
       JOIN document d ON d.id = dv.document_id
       WHERE dv.document_id = $1 AND dv.document_number = $2`,
      [id, versionNumber]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const version = rows[0];

    if (!version.file_path) {
      return NextResponse.json({ error: 'File path not found' }, { status: 404 });
    }

    const iamToken = await getIAMToken();

    const response = await fetch(version.file_path, {
      headers: { Authorization: `Bearer ${iamToken}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch file from storage' },
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const etag = version.checksum
      ? `"${version.checksum}"`
      : `"${createHash('md5').update(Buffer.from(arrayBuffer)).digest('hex')}"`;

    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const ext = version.file_name?.split('.').pop() || 'pdf';
    const disposition =
      request.nextUrl.searchParams.get('inline') === 'true'
        ? `inline; filename="${version.file_name || 'document.pdf'}"`
        : `attachment; filename="v${versionNumber}_${version.file_name || 'document.pdf'}"`;

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': version.file_type || 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=3600',
        ETag: etag,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
